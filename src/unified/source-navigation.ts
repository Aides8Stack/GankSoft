/** One source stack for nested workspace pages. It never reads or writes data. */
export class SourceNavigation<T> {
  private sources:T[]=[];
  enter(source:T){this.sources.push(source);}
  take(){return this.sources.pop();}
  clear(){this.sources=[];}
  get depth(){return this.sources.length;}
}
