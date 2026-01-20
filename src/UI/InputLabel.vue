<script setup>
defineProps({
    value: {
        type: String,
    },
    required:{
        type:Boolean,
        default:false
    }
});
</script>

<template>
    <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
        <span v-if="value">{{ value }}</span>
        <slot v-else />
        <span v-if="required" class="text-red-700" title="Обязательное поле">*</span>
    </label>
</template>
