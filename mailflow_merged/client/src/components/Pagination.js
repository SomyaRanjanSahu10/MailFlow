import React from 'react';

// Feature 3: Reusable pagination control
export default function Pagination({ page, pages, total, limit, onPage }) {
  if (!pages || pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  // Build page number window: [1, ..., page-1, page, page+1, ..., pages]
  const getPages = () => {
    const arr = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
        arr.push(i);
      } else if (arr[arr.length - 1] !== '…') {
        arr.push('…');
      }
    }
    return arr;
  };

  return (
    <div style={S.wrap}>
      <span style={S.info}>Showing {start}–{end} of {total}</span>
      <div style={S.controls}>
        <Btn disabled={page === 1}     onClick={() => onPage(page - 1)}>‹ Prev</Btn>
        {getPages().map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={S.ellipsis}>…</span>
            : <Btn key={p} active={p === page} onClick={() => onPage(p)}>{p}</Btn>
        )}
        <Btn disabled={page === pages} onClick={() => onPage(page + 1)}>Next ›</Btn>
      </div>
    </div>
  );
}

function Btn({ onClick, disabled, active, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'5px 11px', borderRadius:'5px', fontSize:'12px', fontWeight:'500',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: active ? 'none' : '1px solid #e1dfdd',
      background: active ? '#0078d4' : disabled ? '#f3f2f1' : 'white',
      color: active ? 'white' : disabled ? '#a19f9d' : '#323130',
      transition:'all 0.1s',
    }}>{children}</button>
  );
}

const S = {
  wrap:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:'1px solid #e1dfdd', background:'white' },
  info:     { fontSize:'12px', color:'#a19f9d' },
  controls: { display:'flex', alignItems:'center', gap:'4px' },
  ellipsis: { fontSize:'12px', color:'#a19f9d', padding:'0 4px' },
};
