<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref} from 'vue';
import {catalogActions,type CatalogItem,type CatalogAction} from './catalog-management';
const props=defineProps<{item:CatalogItem|null;x:number;y:number}>();
const emit=defineEmits<{choose:[action:CatalogAction];close:[]}>();
const menu=ref<HTMLElement>(),left=ref(0),top=ref(0),options=computed(()=>catalogActions(props.item));
const origin=document.activeElement as HTMLElement|null;
function position(){const r=menu.value?.getBoundingClientRect();if(r){left.value=Math.max(8,Math.min(props.x,innerWidth-r.width-8));top.value=Math.max(8,Math.min(props.y,innerHeight-r.height-8));}}
function key(e:KeyboardEvent){
 if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();emit('close');return;}
 const buttons=Array.from(menu.value!.querySelectorAll<HTMLButtonElement>('button')),i=buttons.indexOf(document.activeElement as HTMLButtonElement);
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
}
onMounted(async()=>{await nextTick();position();menu.value?.querySelector('button')?.focus();window.addEventListener('resize',position);});
onUnmounted(()=>{window.removeEventListener('resize',position);if(origin?.isConnected)origin.focus();});
</script>
<template><Teleport to="body"><div class="catalog-menu-dismiss" @pointerdown.prevent="emit('close')" @contextmenu.prevent="emit('close')"/><div ref="menu" class="catalog-context-menu" role="menu" aria-label="目录管理菜单" :style="{left:left+'px',top:top+'px'}" @keydown="key"><button v-for="option in options" :key="option.key" role="menuitem" :class="{danger:option.danger}" @click="emit('choose',option.key)">{{option.label}}</button></div></Teleport></template>
<style scoped>
.catalog-menu-dismiss{position:fixed;inset:0;z-index:90}.catalog-context-menu{position:fixed;z-index:91;width:228px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);overflow:auto;padding:5px;border:1px solid var(--line,#dce8df);border-radius:9px;background:var(--panel,#fff);box-shadow:0 12px 34px #1d3b2933}.catalog-context-menu button{display:block;width:100%;padding:9px 10px;border:0;background:transparent;border-radius:6px;text-align:left;font:inherit;color:inherit}.catalog-context-menu button:hover,.catalog-context-menu button:focus-visible{background:var(--active,#e4f1e9);outline:2px solid var(--accent,#28765c);outline-offset:-2px}.catalog-context-menu .danger{color:#ba514b}
</style>
