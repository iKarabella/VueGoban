<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        gameInfo:{type:Object, default: {}},
        prisoners:{type:Array, default:[0,0]},
    });

    const emit = defineEmits({revertColors:null});
</script>
<template>
    <div>
        <div class="flex w-full">
            <div class="w-6/12 relative rounded border border-gray-500 p-4 mr-2 bg-gray-800 text-white">
                <div>
                    <div class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm">
                        {{ gameInfo.black_player_name }}
                    </div>
                </div>
                <div class="w-full block mt-2">
                    <span>{{ prisoners[0] }} {{ prisoners[0]==1?'пленный':'пленных' }}</span>
                </div>
            </div>
            <div class="w-6/12 relative rounded border border-gray-500 p-4 ml-2 bg-gray-100">
                <div>
                    <div class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm">
                        {{ gameInfo.white_player_name }}
                    </div>
                </div>
                <div class="w-full block mt-2">
                    <span>{{ prisoners[1] }} {{ prisoners[1]==1?'пленный':'пленных' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>