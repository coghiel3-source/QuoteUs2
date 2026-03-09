<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

$cachedSmtpSettings = null;
$lastSettingsCheck = 0;
$SETTINGS_CACHE_TTL = 60;

function getSmtpSettings() {
    global $cachedSmtpSettings, $lastSettingsCheck, $SETTINGS_CACHE_TTL;

    $now = time();
    if ($cachedSmtpSettings && ($now - $lastSettingsCheck) < $SETTINGS_CACHE_TTL) {
        return $cachedSmtpSettings;
    }

    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT value FROM settings WHERE `key` = :key LIMIT 1");
        $stmt->execute([':key' => 'smtp_settings']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            error_log('[Email] No SMTP settings found in database');
            return null;
        }

        $cachedSmtpSettings = json_decode($row['value'], true);
        $lastSettingsCheck = $now;
        return $cachedSmtpSettings;
    } catch (Exception $e) {
        error_log('[Email] Failed to load SMTP settings: ' . $e->getMessage());
        return null;
    }
}

function clearSmtpCache() {
    global $cachedSmtpSettings, $lastSettingsCheck;
    $cachedSmtpSettings = null;
    $lastSettingsCheck = 0;
    error_log('[Email] SMTP cache cleared');
}

function sendEmail($to, $subject, $html, $text = null) {
    $smtp = getSmtpSettings();

    if (!$smtp) {
        error_log("[Email] No SMTP settings configured - email notification logged but not sent:");
        error_log("  To: $to");
        error_log("  Subject: $subject");
        return false;
    }

    $host = $smtp['host'] ?? '';
    $port = intval($smtp['port'] ?? 587);
    $username = $smtp['username'] ?? '';
    $password = $smtp['password'] ?? '';
    $fromEmail = $smtp['fromEmail'] ?? '';
    $fromName = $smtp['fromName'] ?? 'QuoteUs.ca';
    $useSsl = !empty($smtp['useSsl']);

    $headers = [];
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-Type: text/html; charset=UTF-8";
    $headers[] = "From: \"$fromName\" <$fromEmail>";
    $headers[] = "Reply-To: $fromEmail";
    $headers[] = "X-Mailer: PHP/" . phpversion();

    $useSmtp = !empty($host) && !empty($username) && !empty($password);

    if ($useSmtp) {
        return sendSmtpEmail($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $html, $useSsl);
    }

    $result = @mail($to, $subject, $html, implode("\r\n", $headers));

    if ($result) {
        error_log("[Email] Sent successfully to $to");
    } else {
        error_log("[Email] Failed to send email to $to");
    }

    return $result;
}

function sendSmtpEmail($host, $port, $username, $password, $fromEmail, $fromName, $to, $subject, $body, $useSsl = false) {
    $protocol = ($useSsl && $port === 465) ? 'ssl' : 'tcp';
    $streamHost = ($protocol === 'ssl') ? "ssl://$host" : $host;

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ]
    ]);

    $socket = @stream_socket_client("$streamHost:$port", $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        error_log("[Email] SMTP connection failed: $errstr ($errno)");
        return false;
    }

    $response = fgets($socket, 515);

    $commands = [
        "EHLO " . gethostname(),
    ];

    if ($protocol !== 'ssl' && $port !== 25) {
        $commands[] = "STARTTLS";
    }

    foreach ($commands as $cmd) {
        fwrite($socket, "$cmd\r\n");
        $response = '';
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }

        if ($cmd === "STARTTLS" && substr($response, 0, 3) === '220') {
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            fwrite($socket, "EHLO " . gethostname() . "\r\n");
            $response = '';
            while ($line = fgets($socket, 515)) {
                $response .= $line;
                if (substr($line, 3, 1) === ' ') break;
            }
        }
    }

    fwrite($socket, "AUTH LOGIN\r\n");
    $response = fgets($socket, 515);

    fwrite($socket, base64_encode($username) . "\r\n");
    $response = fgets($socket, 515);

    fwrite($socket, base64_encode($password) . "\r\n");
    $response = fgets($socket, 515);

    if (substr($response, 0, 3) !== '235') {
        error_log("[Email] SMTP authentication failed: $response");
        fwrite($socket, "QUIT\r\n");
        fclose($socket);
        return false;
    }

    fwrite($socket, "MAIL FROM:<$fromEmail>\r\n");
    $response = fgets($socket, 515);

    fwrite($socket, "RCPT TO:<$to>\r\n");
    $response = fgets($socket, 515);

    fwrite($socket, "DATA\r\n");
    $response = fgets($socket, 515);

    $message = "From: \"$fromName\" <$fromEmail>\r\n";
    $message .= "To: <$to>\r\n";
    $message .= "Subject: $subject\r\n";
    $message .= "MIME-Version: 1.0\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "\r\n";
    $message .= $body . "\r\n";
    $message .= ".\r\n";

    fwrite($socket, $message);
    $response = fgets($socket, 515);

    $success = (substr($response, 0, 3) === '250');

    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    if ($success) {
        error_log("[Email] Sent successfully to $to via SMTP");
    } else {
        error_log("[Email] SMTP send failed: $response");
    }

    return $success;
}

function generateNewLeadEmail($leadData) {
    $clientName = htmlspecialchars($leadData['clientName'] ?? '');
    $type = htmlspecialchars($leadData['type'] ?? '');
    $email = htmlspecialchars($leadData['email'] ?? '');
    $phone = isset($leadData['phone']) ? htmlspecialchars($leadData['phone']) : null;
    $source = htmlspecialchars($leadData['source'] ?? 'Website');

    $phoneRow = '';
    if ($phone) {
        $phoneRow = '
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $phone . '</td>
              </tr>';
    }

    $subject = "New $type Insurance Lead - $clientName";
    $html = '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">New Lead Received</h2>
          <p style="color: #4b5563;">A new insurance lead has been submitted and requires your attention.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">' . $clientName . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Insurance Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">' . $type . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $email . '</td>
              </tr>' . $phoneRow . '
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Source:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $source . '</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #4b5563;">Please log in to the CRM to view full details and follow up with this lead.</p>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View in CRM</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>';

    return ['subject' => $subject, 'html' => $html];
}

function generateAssignmentEmail($data) {
    $brokerName = htmlspecialchars($data['brokerName'] ?? '');
    $clientName = htmlspecialchars($data['clientName'] ?? '');
    $type = htmlspecialchars($data['type'] ?? '');
    $email = htmlspecialchars($data['email'] ?? '');
    $phone = isset($data['phone']) ? htmlspecialchars($data['phone']) : null;
    $assignedBy = htmlspecialchars($data['assignedBy'] ?? '');

    $phoneRow = '';
    if ($phone) {
        $phoneRow = '
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $phone . '</td>
              </tr>';
    }

    $subject = "Lead Assigned: $clientName - $type Insurance";
    $html = '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Lead Assigned to You</h2>
          <p style="color: #4b5563;">Hi ' . $brokerName . ',</p>
          <p style="color: #4b5563;">A new lead has been assigned to you by ' . $assignedBy . '.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">' . $clientName . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Insurance Type:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">' . $type . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $email . '</td>
              </tr>' . $phoneRow . '
            </table>
          </div>
          
          <p style="color: #4b5563;">Please follow up with this client as soon as possible.</p>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Lead Details</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>';

    return ['subject' => $subject, 'html' => $html];
}

function generateStatusChangeEmail($data) {
    $clientName = htmlspecialchars($data['clientName'] ?? '');
    $type = htmlspecialchars($data['type'] ?? '');
    $oldStatus = htmlspecialchars($data['oldStatus'] ?? '');
    $newStatus = htmlspecialchars($data['newStatus'] ?? '');
    $changedBy = htmlspecialchars($data['changedBy'] ?? '');

    $subject = "Status Update: $clientName - $oldStatus → $newStatus";
    $html = '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Lead Status Updated</h2>
          <p style="color: #4b5563;">A lead status has been changed by ' . $changedBy . '.</p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">Client:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold;">' . $clientName . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Type:</td>
                <td style="padding: 8px 0; color: #1f2937;">' . $type . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Previous Status:</td>
                <td style="padding: 8px 0; color: #6b7280;">' . $oldStatus . '</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">New Status:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: bold;">' . $newStatus . '</td>
              </tr>
            </table>
          </div>
          
          <a href="https://quoteus.ca/admin" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View in CRM</a>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated notification from QuoteUs.ca</p>
        </div>
      </div>';

    return ['subject' => $subject, 'html' => $html];
}

function generateAdminNotificationEmail($data) {
    return generateNewLeadEmail($data);
}

function generateThankYouEmail($data) {
    $clientName = htmlspecialchars($data['clientName'] ?? '');
    $type = htmlspecialchars($data['type'] ?? '');
    $typeLower = strtolower($type);

    $subject = "Thank You for Your $type Insurance Inquiry - QuoteUs.ca";
    $html = '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Thank You, ' . $clientName . '!</h2>
          <p style="color: #4b5563; font-size: 18px; line-height: 1.6;">
            Thank you for your <strong>' . $type . ' Insurance</strong> inquiry.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You will be contacted shortly by a <strong>top-rated insurance broker</strong> who will help you find the best coverage at competitive rates.
          </p>
          
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p style="color: #1f2937; margin: 0; font-weight: bold;">What happens next?</p>
            <ul style="color: #4b5563; margin-top: 10px; padding-left: 20px;">
              <li>A top-rated broker will review your inquiry</li>
              <li>You\'ll receive a call or email shortly</li>
              <li>We\'ll help you find the best ' . $typeLower . ' insurance coverage</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            If you have any immediate questions, please don\'t hesitate to contact us.
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Best regards,<br>
            <strong>The QuoteUs.ca Team</strong>
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px; background-color: #f3f4f6;">
          <p style="margin: 0 0 8px 0;">Need help? Contact us:</p>
          <p style="margin: 0; font-weight: bold;">1-877-253-2695</p>
          <p style="margin: 8px 0 0 0;">or email us at <a href="mailto:quote@quoteus.ca" style="color: #16a34a; text-decoration: none;">quote@QuoteUs.ca</a></p>
        </div>
        <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">QuoteUs.ca - Your Trusted Ontario Insurance Partner</p>
        </div>
      </div>';

    return ['subject' => $subject, 'html' => $html];
}

function generatePasswordResetEmail($userName, $resetLink) {
    $userName = htmlspecialchars($userName);
    $resetLink = htmlspecialchars($resetLink);

    $subject = "Password Reset Request - QuoteUs.ca";
    $html = '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">QuoteUs.ca</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hello ' . $userName . ',
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="' . $resetLink . '" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            This link will expire in 1 hour. If you didn\'t request a password reset, you can safely ignore this email.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
            If the button doesn\'t work, copy and paste this link into your browser:<br>
            <a href="' . $resetLink . '" style="color: #16a34a; word-break: break-all;">' . $resetLink . '</a>
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Best regards,<br>
            <strong>The QuoteUs.ca Team</strong>
          </p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>QuoteUs.ca - Your Trusted Ontario Insurance Partner</p>
        </div>
      </div>';

    return ['subject' => $subject, 'html' => $html];
}
