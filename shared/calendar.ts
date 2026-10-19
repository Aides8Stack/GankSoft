/** Explicit IANA timezone keeps daily scheduling stable when the OS timezone changes. */
export function calendarDay(date:Date,timeZone='Asia/Shanghai'):string {
 return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
