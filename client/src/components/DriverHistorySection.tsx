import { useFieldArray, Control, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Plus, Trash2, FileWarning, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DriverHistorySectionProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  basePath: string; // e.g. "primaryDriver" or "drivers.0"
}

export function DriverHistorySection({ control, register, setValue, basePath }: DriverHistorySectionProps) {
  const { fields: accidentFields, append: appendAccident, remove: removeAccident } = useFieldArray({
    control,
    name: `${basePath}.accidents`,
  });

  const { fields: ticketFields, append: appendTicket, remove: removeTicket } = useFieldArray({
    control,
    name: `${basePath}.tickets`,
  });

  const { fields: cancellationFields, append: appendCancellation, remove: removeCancellation } = useFieldArray({
    control,
    name: `${basePath}.cancellations`,
  });

  return (
    <div className="space-y-6 pt-4 border-t mt-2">
      <h4 className="font-semibold text-primary flex items-center gap-2">
        <AlertTriangle size={18} /> Driving History
      </h4>

      {/* Accidents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Accidents (Last 6 Years)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-primary hover:bg-primary/10"
            onClick={() => appendAccident({ date: "", type: "not_at_fault" })}
          >
            <Plus size={14} className="mr-1" /> Add Accident
          </Button>
        </div>

        {accidentFields.length === 0 && (
          <div className="text-sm text-muted-foreground italic bg-secondary/20 p-2 rounded text-center">
            No accidents recorded
          </div>
        )}

        <AnimatePresence>
          {accidentFields.map((field: any, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-secondary/10 border-none mb-2">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Accident #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAccident(index)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        {...register(`${basePath}.accidents.${index}.date`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        onValueChange={(val) => setValue(`${basePath}.accidents.${index}.type`, val)}
                        defaultValue={field.type || "not_at_fault"}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_at_fault">Not At Fault</SelectItem>
                          <SelectItem value="at_fault">At Fault</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Tickets (Last 3 Years)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-primary hover:bg-primary/10"
            onClick={() => appendTicket({ date: "", type: "speeding_minor" })}
          >
            <Plus size={14} className="mr-1" /> Add Ticket
          </Button>
        </div>

        {ticketFields.length === 0 && (
          <div className="text-sm text-muted-foreground italic bg-secondary/20 p-2 rounded text-center">
            No tickets recorded
          </div>
        )}

        <AnimatePresence>
          {ticketFields.map((field: any, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-secondary/10 border-none mb-2">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Ticket #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTicket(index)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        {...register(`${basePath}.tickets.${index}.date`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        onValueChange={(val) => setValue(`${basePath}.tickets.${index}.type`, val)}
                        defaultValue={field.type || "speeding_minor"}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="speeding_minor">Speeding (Minor)</SelectItem>
                          <SelectItem value="speeding_major">Speeding (Major)</SelectItem>
                          <SelectItem value="distracted">Distracted Driving</SelectItem>
                          <SelectItem value="other">Other Moving Violation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cancellations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Non-Payment Cancellations (3 Years)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:bg-destructive/10 text-destructive"
            onClick={() => appendCancellation({ date: "", reason: "non_payment" })}
          >
            <Plus size={14} className="mr-1" /> Add Cancellation
          </Button>
        </div>

        {cancellationFields.length === 0 && (
          <div className="text-sm text-muted-foreground italic bg-secondary/20 p-2 rounded text-center">
            No cancellations recorded
          </div>
        )}

        <AnimatePresence>
          {cancellationFields.map((field: any, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-destructive/5 border-destructive/20 mb-2">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-destructive">Cancellation #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCancellation(index)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        {...register(`${basePath}.cancellations.${index}.date`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reason</Label>
                      <Select
                        onValueChange={(val) => setValue(`${basePath}.cancellations.${index}.reason`, val)}
                        defaultValue={field.reason || "non_payment"}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_payment">Non-Payment</SelectItem>
                          <SelectItem value="misrepresentation">Misrepresentation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
