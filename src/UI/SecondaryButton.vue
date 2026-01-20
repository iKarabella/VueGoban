<script setup>
    const props = defineProps({
        type: {
            type: String,
            default: 'button',
        },
        selected:{
            type:Boolean,
            default:false,
        },
        icon:{
            type:Boolean,
            default:false,
        },
        disable:{ //TODO у SecondaryButton и PrimaryButton этот пропс должен быть одинаковым
            type:Boolean,
            default:false
        },
        inactive:{        //TODO свойстово при отображении разбора. т.е. при воспроизведении разбора 
            type:Boolean, //кнопки должны выделятся по сценарию, но быть недоступными для пользователя!
            default:false
        },
        ifSelected:{
            type:String,
            default:' cursor-pointer bg-blue-800 text-white border-gray-300 dark:border-gray-500 hover:bg-blue-700 dark:hover:bg-gray-700 '
        },
        ifNot:{
            type:String,
            default:' cursor-pointer bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-indigo-500 dark:focus:ring-offset-gray-800'
        },
        ifDisable:{
            type:String,
            default:' bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-100'
        }
    });
    const classes=props.icon?'px-4 py-1 border rounded-md text-sm tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 ':'whitespace-nowrap px-4 py-2 border rounded-md font-semibold text-xs uppercase tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 ';
</script>

<template>
    <button
        :type="type"
        :class="classes+(disable ? ifDisable : (selected ? ifSelected : ifNot))"
    >
        <slot />
    </button>
</template>
