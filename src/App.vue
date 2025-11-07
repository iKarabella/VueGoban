<script setup>
import Goban from './components/Goban'; //отображение гобана
import Dashboard from './components/Dashboard'; //отображение гобана
import MovesTree from './components/MovesTree'; //отображение гобана
import GobanApp from './components/GobanApp.js'; //функционал гобана

const { count, double, increment } = GobanApp();
</script>

<template>
  <Goban/>
  <MovesTree/>
  <Dashboard/>
</template>
