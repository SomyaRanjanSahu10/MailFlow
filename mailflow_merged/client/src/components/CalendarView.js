import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
         isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import api from '../utils/api';

const TYPE_COLOR = { holiday: '#d13438', event: '#0078d4', scheduled: '#107c10' };

export default function CalendarView({ scheduledEmails = [] }) {
  const [current,  setCurrent]  = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(`/calendar/holidays/${current.getFullYear()}`)
      .then(r => setHolidays(r.data.events || []))
      .catch(() => {});
  }, [current.getFullYear()]);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart); // 0=Sun

  // Build events map: dateStr → events[]
  const eventMap = {};
  holidays.forEach(h => {
    const k = h.date;
    if (!eventMap[k]) eventMap[k] = [];
    eventMap[k].push({ ...h, type: h.type });
  });
  scheduledEmails.forEach(e => {
    if (!e.scheduledTime) return;
    const k = format(new Date(e.scheduledTime), 'yyyy-MM-dd');
    if (!eventMap[k]) eventMap[k] = [];
    eventMap[k].push({ date: k, name: `📅 ${e.subject}`, type: 'scheduled', email: e });
  });

  const selectedEvents = selected
    ? (eventMap[format(selected, 'yyyy-MM-dd')] || [])
    : [];

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={S.wrapper}>
      {/* Month nav */}
      <div style={S.header}>
        <button style={S.navBtn} onClick={() => setCurrent(subMonths(current, 1))}>‹</button>
        <span style={S.monthTitle}>{format(current, 'MMMM yyyy')}</span>
        <button style={S.navBtn} onClick={() => setCurrent(addMonths(current, 1))}>›</button>
        <button style={S.todayBtn} onClick={() => setCurrent(new Date())}>Today</button>
      </div>

      {/* Weekday headers */}
      <div style={S.grid}>
        {WEEKDAYS.map(d => <div key={d} style={S.weekday}>{d}</div>)}

        {/* Empty pads */}
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} style={S.emptyCell} />)}

        {/* Days */}
        {days.map(day => {
          const k      = format(day, 'yyyy-MM-dd');
          const evs    = eventMap[k] || [];
          const isSel  = selected && isSameDay(day, selected);
          const isTod  = isToday(day);
          const hasHol = evs.some(e => e.type === 'holiday');
          const hasSch = evs.some(e => e.type === 'scheduled');
          const hasEv  = evs.some(e => e.type === 'event');

          return (
            <div
              key={k}
              style={{
                ...S.cell,
                ...(isTod  ? S.todayCell  : {}),
                ...(isSel  ? S.selectedCell : {}),
              }}
              onClick={() => setSelected(isSameDay(day, selected) ? null : day)}
            >
              <span style={{ ...S.dayNum, ...(isTod ? S.todayNum : {}) }}>
                {format(day, 'd')}
              </span>
              <div style={S.dots}>
                {hasHol && <span style={{ ...S.dot, background: TYPE_COLOR.holiday }} />}
                {hasSch && <span style={{ ...S.dot, background: TYPE_COLOR.scheduled }} />}
                {hasEv  && <span style={{ ...S.dot, background: TYPE_COLOR.event }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events panel for selected day */}
      {selected && (
        <div style={S.eventsPanel}>
          <div style={S.eventsPanelHeader}>
            {format(selected, 'EEEE, MMMM d')}
          </div>
          {selectedEvents.length === 0
            ? <div style={S.noEvents}>No events this day</div>
            : selectedEvents.map((ev, i) => (
                <div key={i} style={{ ...S.eventItem, borderLeft: `3px solid ${TYPE_COLOR[ev.type] || '#999'}` }}>
                  <span style={{ ...S.eventTypePill, background: TYPE_COLOR[ev.type] }}>
                    {ev.type === 'holiday' ? '🏖️' : ev.type === 'scheduled' ? '📧' : '📌'}
                  </span>
                  <div style={S.eventInfo}>
                    <div style={S.eventName}>{ev.name}</div>
                    {ev.email && (
                      <div style={S.eventSub}>
                        To: {ev.email.toEmail || ev.email.receiver?.email} ·{' '}
                        {format(new Date(ev.email.scheduledTime), 'h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Legend */}
      <div style={S.legend}>
        {[['holiday','🏖️ Holiday'],['scheduled','📧 Scheduled Email'],['event','📌 Event']].map(([type, label]) => (
          <div key={type} style={S.legendItem}>
            <span style={{ ...S.dot, background: TYPE_COLOR[type] }} />
            <span style={S.legendLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  wrapper:     { display:'flex', flexDirection:'column', gap:'0', flex:1, background:'white', overflow:'auto' },
  header:      { display:'flex', alignItems:'center', gap:'10px', padding:'16px 20px 12px', borderBottom:'1px solid #e1dfdd' },
  monthTitle:  { flex:1, textAlign:'center', fontSize:'16px', fontWeight:'700', color:'#201f1e' },
  navBtn:      { background:'transparent', border:'1px solid #e1dfdd', borderRadius:'6px', padding:'5px 12px', fontSize:'18px', cursor:'pointer', color:'#605e5c' },
  todayBtn:    { padding:'5px 12px', background:'#0078d4', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  grid:        { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'1px', background:'#e1dfdd', padding:'0', margin:'0 16px' },
  weekday:     { background:'#f9f9f9', padding:'8px 0', textAlign:'center', fontSize:'11px', fontWeight:'700', color:'#a19f9d', letterSpacing:'0.5px' },
  emptyCell:   { background:'white', minHeight:'64px' },
  cell:        { background:'white', minHeight:'64px', padding:'6px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', transition:'background 0.1s', position:'relative' },
  todayCell:   { background:'#fff4e6' },
  selectedCell:{ background:'#deecf9', outline:'2px solid #0078d4' },
  dayNum:      { fontSize:'13px', fontWeight:'500', color:'#323130', marginBottom:'3px' },
  todayNum:    { background:'#0078d4', color:'white', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700' },
  dots:        { display:'flex', gap:'3px', flexWrap:'wrap', marginTop:'auto' },
  dot:         { width:'7px', height:'7px', borderRadius:'50%', flexShrink:0 },
  eventsPanel: { margin:'12px 16px 0', background:'#f9f9f9', borderRadius:'8px', border:'1px solid #e1dfdd', overflow:'hidden' },
  eventsPanelHeader: { padding:'10px 14px', fontWeight:'700', fontSize:'13px', color:'#201f1e', borderBottom:'1px solid #e1dfdd', background:'white' },
  noEvents:    { padding:'14px', color:'#a19f9d', fontSize:'13px', textAlign:'center' },
  eventItem:   { display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 14px', borderBottom:'1px solid #f0f0f0', background:'white', marginBottom:'1px' },
  eventTypePill:{ fontSize:'14px', flexShrink:0, marginTop:'1px' },
  eventInfo:   { flex:1 },
  eventName:   { fontSize:'13px', fontWeight:'500', color:'#201f1e' },
  eventSub:    { fontSize:'11px', color:'#a19f9d', marginTop:'2px' },
  legend:      { display:'flex', gap:'16px', padding:'10px 20px', borderTop:'1px solid #e1dfdd', flexWrap:'wrap' },
  legendItem:  { display:'flex', alignItems:'center', gap:'5px' },
  legendLabel: { fontSize:'11px', color:'#605e5c' },
};
