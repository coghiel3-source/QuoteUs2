<?php

require_once __DIR__ . '/database.php';

class Storage {

    // ─── User Operations ───

    public function getUser(string $id): ?array {
        return db()->fetchOne("SELECT * FROM `users` WHERE `id` = ?", [$id]);
    }

    public function getUserByEmail(string $email): ?array {
        return db()->fetchOne("SELECT * FROM `users` WHERE `email` = ?", [$email]);
    }

    public function getUserByResetToken(string $token): ?array {
        return db()->fetchOne("SELECT * FROM `users` WHERE `reset_token` = ?", [$token]);
    }

    public function createUser(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['role'])) $data['role'] = 'customer';
        if (!isset($data['status'])) $data['status'] = 'active';
        if (!isset($data['balance'])) $data['balance'] = DEFAULT_BALANCE;
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();

        if (isset($data['product_types']) && is_array($data['product_types'])) {
            $data['product_types'] = json_encode($data['product_types']);
        }
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $data['permissions'] = json_encode($data['permissions']);
        }
        if (isset($data['assigned_postal_codes']) && is_array($data['assigned_postal_codes'])) {
            $data['assigned_postal_codes'] = json_encode($data['assigned_postal_codes']);
        }
        if (isset($data['assigned_cities']) && is_array($data['assigned_cities'])) {
            $data['assigned_cities'] = json_encode($data['assigned_cities']);
        }
        if (isset($data['preferred_insurance_types']) && is_array($data['preferred_insurance_types'])) {
            $data['preferred_insurance_types'] = json_encode($data['preferred_insurance_types']);
        }

        db()->insertWithUUID('users', $data);
        return $this->getUser($data['id']);
    }

    public function updateUser(string $id, array $data): ?array {
        if (isset($data['product_types']) && is_array($data['product_types'])) {
            $data['product_types'] = json_encode($data['product_types']);
        }
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $data['permissions'] = json_encode($data['permissions']);
        }
        if (isset($data['assigned_postal_codes']) && is_array($data['assigned_postal_codes'])) {
            $data['assigned_postal_codes'] = json_encode($data['assigned_postal_codes']);
        }
        if (isset($data['assigned_cities']) && is_array($data['assigned_cities'])) {
            $data['assigned_cities'] = json_encode($data['assigned_cities']);
        }
        if (isset($data['preferred_insurance_types']) && is_array($data['preferred_insurance_types'])) {
            $data['preferred_insurance_types'] = json_encode($data['preferred_insurance_types']);
        }

        $rows = db()->update('users', $data, '`id` = ?', [$id]);
        if ($rows === 0 && !$this->getUser($id)) return null;
        return $this->getUser($id);
    }

    public function setResetToken(string $userId, string $token, string $expiry): void {
        db()->update('users', [
            'reset_token' => $token,
            'reset_token_expiry' => $expiry,
        ], '`id` = ?', [$userId]);
    }

    public function clearResetToken(string $userId): void {
        db()->update('users', [
            'reset_token' => null,
            'reset_token_expiry' => null,
        ], '`id` = ?', [$userId]);
    }

    public function updatePassword(string $userId, string $password): void {
        db()->update('users', ['password' => $password], '`id` = ?', [$userId]);
    }

    public function getAllUsers(): array {
        return db()->fetchAll("SELECT * FROM `users`");
    }

    // ─── Quote Operations ───

    public function getQuote(string $id): ?array {
        $quote = db()->fetchOne("SELECT * FROM `quotes` WHERE `id` = ?", [$id]);
        if ($quote) {
            $quote['details'] = json_decode($quote['details'] ?? '{}', true);
            $quote['binder_documents'] = json_decode($quote['binder_documents'] ?? '[]', true);
        }
        return $quote;
    }

    public function getAllQuotes(): array {
        $quotes = db()->fetchAll("SELECT * FROM `quotes` ORDER BY `created_at` DESC");
        foreach ($quotes as &$q) {
            $q['details'] = json_decode($q['details'] ?? '{}', true);
            $q['binder_documents'] = json_decode($q['binder_documents'] ?? '[]', true);
        }
        return $quotes;
    }

    public function createQuote(array $data): array {
        $data['id'] = Database::generateUUID();

        $year = date('Y');
        $randomNum = rand(1000, 9999);
        $data['quote_number'] = "Q-{$year}-{$randomNum}";

        if (!isset($data['status'])) $data['status'] = 'New';
        if (!isset($data['priority'])) $data['priority'] = 'Medium';
        if (!isset($data['source'])) $data['source'] = 'Web Form';
        if (!isset($data['internal_notes'])) $data['internal_notes'] = '';
        if (!isset($data['binder_required'])) $data['binder_required'] = 0;
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();
        if (!isset($data['updated_at'])) $data['updated_at'] = Database::now();

        if (isset($data['details']) && is_array($data['details'])) {
            $data['details'] = json_encode($data['details']);
        } elseif (!isset($data['details'])) {
            $data['details'] = '{}';
        }
        if (isset($data['binder_documents']) && is_array($data['binder_documents'])) {
            $data['binder_documents'] = json_encode($data['binder_documents']);
        } elseif (!isset($data['binder_documents'])) {
            $data['binder_documents'] = '[]';
        }

        if (isset($data['binder_required'])) {
            $data['binder_required'] = $data['binder_required'] ? 1 : 0;
        }

        db()->insertWithUUID('quotes', $data);
        return $this->getQuote($data['id']);
    }

    public function updateQuote(string $id, array $data): ?array {
        $data['updated_at'] = Database::now();

        if (isset($data['details']) && is_array($data['details'])) {
            $data['details'] = json_encode($data['details']);
        }
        if (isset($data['binder_documents']) && is_array($data['binder_documents'])) {
            $data['binder_documents'] = json_encode($data['binder_documents']);
        }
        if (isset($data['binder_required'])) {
            $data['binder_required'] = $data['binder_required'] ? 1 : 0;
        }

        $rows = db()->update('quotes', $data, '`id` = ?', [$id]);
        if ($rows === 0 && !$this->getQuote($id)) return null;
        return $this->getQuote($id);
    }

    public function deleteQuote(string $id): bool {
        return db()->delete('quotes', '`id` = ?', [$id]) > 0;
    }

    // ─── Activity Operations ───

    public function getActivitiesForQuote(string $quoteId): array {
        return db()->fetchAll(
            "SELECT * FROM `activities` WHERE `quote_id` = ? ORDER BY `created_at` DESC",
            [$quoteId]
        );
    }

    public function createActivity(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();

        db()->insertWithUUID('activities', $data);
        return db()->fetchOne("SELECT * FROM `activities` WHERE `id` = ?", [$data['id']]);
    }

    // ─── Balance & Transaction Operations ───

    public function getUserBalance(string $userId): string {
        $user = $this->getUser($userId);
        return $user['balance'] ?? '0.00';
    }

    public function updateUserBalance(string $userId, string $newBalance): ?array {
        db()->update('users', ['balance' => $newBalance], '`id` = ?', [$userId]);
        return $this->getUser($userId);
    }

    public function createTransaction(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();

        db()->insertWithUUID('transactions', $data);
        return db()->fetchOne("SELECT * FROM `transactions` WHERE `id` = ?", [$data['id']]);
    }

    public function getTransactionsForUser(string $userId): array {
        return db()->fetchAll(
            "SELECT * FROM `transactions` WHERE `user_id` = ? ORDER BY `created_at` DESC",
            [$userId]
        );
    }

    public function getAllTransactions(): array {
        return db()->fetchAll("SELECT * FROM `transactions` ORDER BY `created_at` DESC");
    }

    public function creditBalance(
        string $userId,
        string $amount,
        string $type,
        string $description,
        array $options = []
    ): array {
        return db()->transaction(function($db) use ($userId, $amount, $type, $description, $options) {
            $currentBalance = (float) $this->getUserBalance($userId);
            $creditAmount = (float) $amount;
            $newBalance = number_format($currentBalance + $creditAmount, 2, '.', '');

            $user = $this->updateUserBalance($userId, $newBalance);
            if (!$user) throw new RuntimeException("User not found");

            $txnData = [
                'user_id' => $userId,
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'description' => $description,
            ];
            if (!empty($options['reason'])) $txnData['reason'] = $options['reason'];
            if (!empty($options['stripe_payment_id'])) $txnData['stripe_payment_id'] = $options['stripe_payment_id'];
            if (!empty($options['actor_id'])) $txnData['actor_id'] = $options['actor_id'];
            if (!empty($options['actor_name'])) $txnData['actor_name'] = $options['actor_name'];

            $transaction = $this->createTransaction($txnData);

            return ['user' => $user, 'transaction' => $transaction];
        });
    }

    public function debitBalance(
        string $userId,
        string $amount,
        string $description,
        array $options = []
    ): ?array {
        return db()->transaction(function($db) use ($userId, $amount, $description, $options) {
            $currentBalance = (float) $this->getUserBalance($userId);
            $debitAmount = (float) $amount;

            if ($currentBalance < $debitAmount) {
                return null;
            }

            $newBalance = number_format($currentBalance - $debitAmount, 2, '.', '');

            $user = $this->updateUserBalance($userId, $newBalance);
            if (!$user) throw new RuntimeException("User not found");

            $txnData = [
                'user_id' => $userId,
                'type' => 'lead_deduction',
                'amount' => '-' . $amount,
                'balance_after' => $newBalance,
                'description' => $description,
            ];
            if (!empty($options['quote_id'])) $txnData['quote_id'] = $options['quote_id'];
            if (!empty($options['actor_id'])) $txnData['actor_id'] = $options['actor_id'];
            if (!empty($options['actor_name'])) $txnData['actor_name'] = $options['actor_name'];

            $transaction = $this->createTransaction($txnData);

            return ['user' => $user, 'transaction' => $transaction];
        });
    }

    // ─── System Settings Operations ───

    public function getSetting(string $key): ?string {
        $row = db()->fetchOne("SELECT `value` FROM `system_settings` WHERE `key` = ?", [$key]);
        return $row ? $row['value'] : null;
    }

    public function setSetting(string $key, string $value, ?string $updatedBy = null): array {
        $existing = $this->getSetting($key);

        if ($existing !== null) {
            $data = ['value' => $value, 'updated_at' => Database::now()];
            if ($updatedBy !== null) $data['updated_by'] = $updatedBy;
            db()->update('system_settings', $data, '`key` = ?', [$key]);
            return db()->fetchOne("SELECT * FROM `system_settings` WHERE `key` = ?", [$key]);
        } else {
            $id = Database::generateUUID();
            $data = [
                'id' => $id,
                'key' => $key,
                'value' => $value,
                'updated_at' => Database::now(),
            ];
            if ($updatedBy !== null) $data['updated_by'] = $updatedBy;
            db()->insertWithUUID('system_settings', $data);
            return db()->fetchOne("SELECT * FROM `system_settings` WHERE `id` = ?", [$id]);
        }
    }

    // ─── Advertisement Operations ───

    public function getAllAdvertisements(): array {
        return db()->fetchAll("SELECT * FROM `advertisements` ORDER BY `created_at` DESC");
    }

    public function getAdvertisement(string $id): ?array {
        return db()->fetchOne("SELECT * FROM `advertisements` WHERE `id` = ?", [$id]);
    }

    public function getAdvertisementByPreviewToken(string $token): ?array {
        return db()->fetchOne("SELECT * FROM `advertisements` WHERE `preview_token` = ?", [$token]);
    }

    public function getActiveAdsForPage(string $page): array {
        $now = Database::now();
        $ads = db()->fetchAll(
            "SELECT * FROM `advertisements`
             WHERE `status` = 'active'
               AND (`start_date` IS NULL OR `start_date` <= ?)
               AND (`end_date` IS NULL OR `end_date` >= ?)
             ORDER BY `priority` DESC",
            [$now, $now]
        );

        return array_values(array_filter($ads, function($ad) use ($page) {
            $targetPages = json_decode($ad['target_pages'] ?? '[]', true);
            if (!is_array($targetPages)) $targetPages = [];
            return count($targetPages) === 0
                || in_array($page, $targetPages)
                || in_array('all', $targetPages);
        }));
    }

    public function createAdvertisement(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['media_type'])) $data['media_type'] = 'image';
        if (!isset($data['status'])) $data['status'] = 'active';
        if (!isset($data['priority'])) $data['priority'] = 1;
        if (!isset($data['impressions'])) $data['impressions'] = 0;
        if (!isset($data['clicks'])) $data['clicks'] = 0;
        if (empty($data['preview_token'])) $data['preview_token'] = Database::generateUUID();
        if (!isset($data['approval_status'])) $data['approval_status'] = 'pending';
        if (!isset($data['open_in_popup'])) $data['open_in_popup'] = 0;
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();
        if (!isset($data['updated_at'])) $data['updated_at'] = Database::now();

        if (isset($data['target_pages']) && is_array($data['target_pages'])) {
            $data['target_pages'] = json_encode($data['target_pages']);
        } elseif (!isset($data['target_pages'])) {
            $data['target_pages'] = '[]';
        }

        if (isset($data['open_in_popup'])) {
            $data['open_in_popup'] = $data['open_in_popup'] ? 1 : 0;
        }

        db()->insertWithUUID('advertisements', $data);
        return $this->getAdvertisement($data['id']);
    }

    public function updateAdvertisement(string $id, array $data): ?array {
        $data['updated_at'] = Database::now();

        if (isset($data['target_pages']) && is_array($data['target_pages'])) {
            $data['target_pages'] = json_encode($data['target_pages']);
        }
        if (isset($data['open_in_popup'])) {
            $data['open_in_popup'] = $data['open_in_popup'] ? 1 : 0;
        }

        $rows = db()->update('advertisements', $data, '`id` = ?', [$id]);
        if ($rows === 0 && !$this->getAdvertisement($id)) return null;
        return $this->getAdvertisement($id);
    }

    public function deleteAdvertisement(string $id): bool {
        return db()->delete('advertisements', '`id` = ?', [$id]) > 0;
    }

    public function incrementAdImpression(string $id): void {
        db()->query("UPDATE `advertisements` SET `impressions` = `impressions` + 1 WHERE `id` = ?", [$id]);
    }

    public function incrementAdClick(string $id): void {
        db()->query("UPDATE `advertisements` SET `clicks` = `clicks` + 1 WHERE `id` = ?", [$id]);
    }

    // ─── Broker Notes Operations ───

    public function getBrokerNotes(string $brokerId): array {
        return db()->fetchAll(
            "SELECT * FROM `broker_notes` WHERE `broker_id` = ? ORDER BY `created_at` DESC",
            [$brokerId]
        );
    }

    public function createBrokerNote(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();

        db()->insertWithUUID('broker_notes', $data);
        return db()->fetchOne("SELECT * FROM `broker_notes` WHERE `id` = ?", [$data['id']]);
    }

    public function deleteBrokerNote(string $id): bool {
        return db()->delete('broker_notes', '`id` = ?', [$id]) > 0;
    }

    // ─── Partner Redirect Operations ───

    public function getAllPartnerRedirects(): array {
        return db()->fetchAll("SELECT * FROM `partner_redirects` ORDER BY `created_at` DESC");
    }

    public function getPartnerRedirect(string $id): ?array {
        return db()->fetchOne("SELECT * FROM `partner_redirects` WHERE `id` = ?", [$id]);
    }

    public function getPartnerRedirectByQuoteType(string $quoteType): ?array {
        return db()->fetchOne(
            "SELECT * FROM `partner_redirects` WHERE `quote_type` = ? AND `is_active` = 1",
            [$quoteType]
        );
    }

    public function createPartnerRedirect(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['is_active'])) $data['is_active'] = 1;
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();
        if (!isset($data['updated_at'])) $data['updated_at'] = Database::now();

        if (isset($data['is_active'])) {
            $data['is_active'] = $data['is_active'] ? 1 : 0;
        }

        db()->insertWithUUID('partner_redirects', $data);
        return $this->getPartnerRedirect($data['id']);
    }

    public function updatePartnerRedirect(string $id, array $data): ?array {
        $data['updated_at'] = Database::now();

        if (isset($data['is_active'])) {
            $data['is_active'] = $data['is_active'] ? 1 : 0;
        }

        $rows = db()->update('partner_redirects', $data, '`id` = ?', [$id]);
        if ($rows === 0 && !$this->getPartnerRedirect($id)) return null;
        return $this->getPartnerRedirect($id);
    }

    public function deletePartnerRedirect(string $id): bool {
        return db()->delete('partner_redirects', '`id` = ?', [$id]) > 0;
    }

    // ─── Referral Partner Operations ───

    public function getAllReferralPartners(): array {
        return db()->fetchAll("SELECT * FROM `referral_partners` ORDER BY `created_at` DESC");
    }

    public function getReferralPartner(string $id): ?array {
        return db()->fetchOne("SELECT * FROM `referral_partners` WHERE `id` = ?", [$id]);
    }

    public function getReferralPartnerByReferenceId(string $referenceId): ?array {
        return db()->fetchOne(
            "SELECT * FROM `referral_partners` WHERE UPPER(`reference_id`) = UPPER(?)",
            [$referenceId]
        );
    }

    public function createReferralPartner(array $data): array {
        $data['id'] = Database::generateUUID();
        if (!isset($data['status'])) $data['status'] = 'active';
        if (!isset($data['created_at'])) $data['created_at'] = Database::now();
        if (!isset($data['updated_at'])) $data['updated_at'] = Database::now();

        db()->insertWithUUID('referral_partners', $data);
        return $this->getReferralPartner($data['id']);
    }

    public function updateReferralPartner(string $id, array $data): ?array {
        $data['updated_at'] = Database::now();

        $rows = db()->update('referral_partners', $data, '`id` = ?', [$id]);
        if ($rows === 0 && !$this->getReferralPartner($id)) return null;
        return $this->getReferralPartner($id);
    }

    public function deleteReferralPartner(string $id): bool {
        return db()->delete('referral_partners', '`id` = ?', [$id]) > 0;
    }

    public function getNextReferenceIdForProvince(string $province): string {
        $prefix = strtoupper($province);
        $row = db()->fetchOne(
            "SELECT `reference_id` FROM `referral_partners`
             WHERE UPPER(LEFT(`reference_id`, 2)) = ?
             ORDER BY `reference_id` DESC LIMIT 1",
            [$prefix]
        );

        $maxNum = 0;
        if ($row) {
            $numPart = (int) substr($row['reference_id'], 2);
            if ($numPart > $maxNum) $maxNum = $numPart;
        }

        $nextNum = $maxNum + 1;
        return $prefix . str_pad((string) $nextNum, 7, '0', STR_PAD_LEFT);
    }
}

function storage(): Storage {
    static $instance = null;
    if ($instance === null) {
        $instance = new Storage();
    }
    return $instance;
}
