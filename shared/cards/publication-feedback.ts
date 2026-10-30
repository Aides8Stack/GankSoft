// Publication rules return stable field keys; only this boundary turns them into
// actionable user feedback. Unknown keys must never leak implementation names.
const instructions: Record<string, string> = {
  title: '请填写标题',
  stem: '请填写题干',
  options: '请至少添加两个选项',
  correctOptionId: '请选择正确答案',
  optionText: '请填写每个选项的正文',
  front: '请填写正面问题',
  back: '请填写背面答案',
  body: '请填写记忆正文',
  'legacyOptions:explicit-conversion-required': '请先整理旧题选项',
};
export function publicationFeedback(fields: readonly string[]): string {
  return [...new Set(fields.map(field => instructions[field] ?? '请检查卡片必填内容'))].join('；');
}
