import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationFeedback} from '../shared/cards/publication-feedback.ts';
import {publicationIssues} from '../shared/protocol/card-draft.ts';

test('publication feedback translates every required field while preserving validation rules',()=>{
  const payload={encoding:'question-v1' as const,mode:'question' as const,fields:{stem:'',material:'',analysis:'',source:'',initialThought:'',options:[],correctOptionId:null}};
  assert.deepEqual(publicationIssues(payload),['stem','options','correctOptionId']);
  assert.equal(publicationFeedback(['title',...publicationIssues(payload)]),'请填写标题；请填写题干；请至少添加两个选项；请选择正确答案');
  assert.equal(publicationFeedback(['optionText','front','back','body','legacyOptions:explicit-conversion-required']),'请填写每个选项的正文；请填写正面问题；请填写背面答案；请填写记忆正文；请先整理旧题选项');
  assert.equal(publicationFeedback(['futureInternalKey','anotherInternalKey']),'请检查卡片必填内容');
});
