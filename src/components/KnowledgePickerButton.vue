<script setup lang="ts">
import {ref} from 'vue';
import {useKnowledgePicker} from '../composables/knowledgePicker';
const props=defineProps<{deckId:string;compact?:boolean;purpose?:'association'|'filter'}>();
const model=defineModel<string[]>({required:true}),error=ref('');
const picker=useKnowledgePicker(()=>props.deckId);
async function choose(){error.value='';try{const result=await picker.open({deckId:props.deckId,initialSelectedIds:model.value,purpose:props.purpose??'association',allowSelectDescendants:true});if(result.status==='confirmed')model.value=[...result.nodeIds];}catch(e){error.value=String(e);}}
</script>
<template><div><button type="button" class="btn" @click="choose">选择知识点（{{model.length}}）</button><p v-if="error" role="alert">{{error}}</p></div></template>
