<script>
    export default{
        props: {
            disabled:{ //TODO у SecondaryButton и PrimaryButton этот пропс должен быть одинаковым
                type:Boolean, 
                default:false,
            },
        }
    }
</script>
<template>
    <button
        class="inline-flex justify-center px-4 py-2 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest transition ease-in-out duration-150"
        :class="{'bg-gray-800 dark:bg-gray-200 focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-gray-700 dark:focus:ring-offset-gray-800 dark:hover:bg-white cursor-pointer':disabled==false, 'bg-gray-600 dark:bg-gray-400 cursor-default':disabled==true}"
    >
        <slot />
    </button>
</template>
