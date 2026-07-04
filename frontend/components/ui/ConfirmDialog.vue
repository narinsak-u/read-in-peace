<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="data-[state=open]:slide-in-from-bottom-[30%] sm:data-[state=open]:slide-in-from-bottom-[15%] data-[state=closed]:slide-out-to-bottom-[30%] sm:data-[state=closed]:slide-out-to-bottom-[15%]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="archivalOutline" @click="emit('update:open', false)">
          {{ cancelLabel ?? "Cancel" }}
        </Button>
        <Button variant="archival" @click="emit('confirm')">
          {{ confirmLabel ?? "Confirm" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
