<script setup>
import InputLabel from '../../UI/InputLabel.vue';
import TextInput from '../../UI/TextInput.vue';
import PrimaryButton from '../../UI/PrimaryButton.vue';
import { computed, ref } from 'vue';
import Dropdown from '../../UI/Dropdown.vue';
import SecondaryButton from '../../UI/SecondaryButton.vue';
    
const props = defineProps({
    goban_sizes: {
        type: Array,
        default:['19*19', '13*13', '9*9']
    }
});
const emit = defineEmits(['createNewGame']);

const available_rules = ['Японские', 'Китайские'];
const time_controls = ['Беёми', 'Абсолют', 'Фишер'];

const createGameForm = ref({
    goban_size: [19,19],
    white_player_name: 'White',
    white_player_rank: null,
    black_player_name: 'Black',
    black_player_rank: null,
    rules:'Японские',
    game_date: null,   //YYYY-MM-DD
    game_result: null,//B+Resign
    main_time: 30, //Основное время в минутах
    overtime: '', //Контроль времени
    handicap:0, //Фора
});

const time_settings = ref({
    type:'Беёми',
    periods:2,
    seconds:15,
});

const goban_size = ref('19*19');

const canCreate = computed(()=>{
    return true;
});

const createGame = (cancel=false)=>{
    if (cancel) {
        emit('createNewGame', null);
        return;
    }
    if (!canCreate.value) return;

    if(goban_size.value=='19*19') createGameForm.value.goban_size = [19,19];
    else if(goban_size.value=='13*13') createGameForm.value.goban_size = [13,13];
    else if(goban_size.value=='9*9') createGameForm.value.goban_size = [9,9];

    if (time_settings.value.type=='Абсолют') createGameForm.value.overtime='ABSOLUT';
    else if(time_settings.value.type=='Беёми') 
    {
        createGameForm.value.overtime='BYOMI'+time_settings.value.periods+'-'+time_settings.value.seconds;
    }
    else if (time_settings.value.type=='Фишер')
    {
        createGameForm.value.overtime='FISHER'+time_settings.value.seconds;
    }
    emit('createNewGame', createGameForm.value);
}

</script>
<template>
    <div class="p-4">
        <div>
            Новая игра
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div>
                <InputLabel for="black_player_name" value="Игрок черными"/>
                <TextInput 
                    id="black_player_name"
                    type="text"
                    v-model="createGameForm.black_player_name"
                />
            </div>
            <div>
                <InputLabel for="white_player_name" value="Игрок белыми"/>
                <TextInput 
                    id="white_player_name"
                    type="text"
                    v-model="createGameForm.white_player_name"
                />
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
            <div>
                <InputLabel for="goban_size" value="Размер доски"/>
                <Dropdown>
                    <template #trigger>
                        <span class="inline-flex rounded-md">
                            <button
                                type="button"
                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                            >
                            {{ goban_size }}
                                <svg
                                    class="ms-2 -me-0.5 h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </button>
                        </span>
                    </template>

                    <template #content>
                        <div v-for="(gsize, gindex) in goban_sizes" :key="gindex">
                            <span @click="goban_size=gsize" class="cursor-pointer">{{ gsize }}</span>
                        </div>
                    </template>
                </Dropdown>
            </div>
            <div>
                <InputLabel for="game_rules" value="Правила"/>
                <Dropdown>
                    <template #trigger>
                        <span class="inline-flex rounded-md">
                            <button
                                type="button"
                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                            >
                            {{ createGameForm.rules }}
                                <svg
                                    class="ms-2 -me-0.5 h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </button>
                        </span>
                    </template>

                    <template #content>
                        <div v-for="(rules, rindex) in available_rules" :key="rindex">
                            <span @click="createGameForm.rules=rules" class="cursor-pointer">{{ rules }}</span>
                        </div>
                    </template>
                </Dropdown>
            </div>
            <div>
                <InputLabel for="handicap" value="Фора"/>
                <TextInput 
                    id="handicap"
                    type="number"
                    v-model="createGameForm.handicap"
                />
            </div>
        </div>
        <div>
            <InputLabel for="time_control" value="Контроль времени"/>
            <div class="flex">
                <Dropdown>
                <template #trigger>
                    <span class="inline-flex rounded-md">
                        <button
                            type="button"
                            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                        >
                        {{ time_settings.type }}
                            <svg
                                class="ms-2 -me-0.5 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </button>
                    </span>
                </template>
                <template #content>
                    <div v-for="(control, cindex) in time_controls" :key="cindex">
                        <span @click="time_settings.type=control" class="cursor-pointer">{{ control }}</span>
                    </div>
                </template>
            </Dropdown>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
            <div>
                <InputLabel for="main_time" value="Основное время (мин)"/>
                <TextInput 
                    id="main_time"
                    type="number"
                    v-model="createGameForm.main_time"
                />
            </div>
            <div v-show="time_settings.type=='Беёми'">
                <InputLabel for="periods_bm" value="Периодов беёми"/>
                <TextInput 
                    id="periods_bm"
                    type="number"
                    v-model="time_settings.periods"
                />
            </div>
            <div v-show="time_settings.type!='Абсолют'">
                <InputLabel for="add_time" :value="time_settings.type=='Фишер'?'Приращение (cек/ход)':'Беёми (сек)'"/>
                <TextInput 
                    id="add_time"
                    type="number"
                    v-model="time_settings.seconds"
                />
            </div>
        </div>
        <div class="flex gap-2 mt-4">
            <SecondaryButton @click="createGame(true)">Отменить</SecondaryButton>
            <PrimaryButton @click="createGame()" :disabled="!canCreate">Создать</PrimaryButton>
        </div>
    </div>
</template>