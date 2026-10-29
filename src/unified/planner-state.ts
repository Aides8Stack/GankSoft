import type {StudyFilter} from '../../shared/study-query';
export interface PlannerState {filters:StudyFilter;mode:'all'|'question'|'qa'|'direct';random:boolean;count:number;scope:'eligible'|'checked';weighted:boolean;seed:string}
