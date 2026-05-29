import React, { useState } from 'react';

function DrillDownCharts({ data, onDrillDown }) {
  const [hoveredChart, setHoveredChart] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });

  const showTooltip = (chartName, idx, event, label, value) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const parentRect = event.currentTarget.parentElement.getBoundingClientRect();
    setHoveredChart(chartName);
    setHoveredIdx(idx);
    setHoveredPos({
      x: event.clientX - parentRect.left + 10,
      y: event.clientY - parentRect.top - 40,
      label,
      value
    });
  };

  const hideTooltip = () => {
    setHoveredChart(null);
    setHoveredIdx(null);
  };

  // --- GRADIENT DEF COMPONENT ---
  const ChartGradients = () => (
    <svg style={{ height: 0, width: 0, position: 'absolute' }}>
      <defs>
        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4299e1" />
          <stop offset="100%" stopColor="var(--text-primary)" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#48bb78" />
          <stop offset="100%" stopColor="#22543d" />
        </linearGradient>
        <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f56565" />
          <stop offset="100%" stopColor="#742a2a" />
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9f7aea" />
          <stop offset="100%" stopColor="#44337a" />
        </linearGradient>
        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#319795" />
          <stop offset="100%" stopColor="#1d4044" />
        </linearGradient>
        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ed8936" />
          <stop offset="100%" stopColor="#7b341e" />
        </linearGradient>
      </defs>
    </svg>
  );

  // --- 1. MONTH-WISE BAR CHART ---
  const MonthWiseChart = () => {
    const months = data.monthWise || [
      { label: 'Jan', count: 12 },
      { label: 'Feb', count: 18 },
      { label: 'Mar', count: 15 },
      { label: 'Apr', count: 8 },
      { label: 'May', count: 20 },
      { label: 'Jun', count: 24 }
    ];

    const maxCount = Math.max(...months.map(m => m.count), 1);
    const height = 180;
    const width = 280;
    const padding = 30;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const barWidth = chartWidth / months.length - 8;

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Month-wise Interviews</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click bars to filter)</span>
        </h4>
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
              <line
                key={idx}
                x1={padding}
                y1={padding + chartHeight * (1 - val)}
                x2={width - padding}
                y2={padding + chartHeight * (1 - val)}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
            {/* Bars */}
            {months.map((m, idx) => {
              const barHeight = (m.count / maxCount) * chartHeight;
              const x = padding + idx * (chartWidth / months.length) + 4;
              const y = padding + chartHeight - barHeight;
              const isHovered = hoveredChart === 'month' && hoveredIdx === idx;

              return (
                <g key={idx} cursor="pointer" onClick={() => onDrillDown('month', m.label)}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 4)}
                    rx="4"
                    fill={isHovered ? 'url(#purpleGrad)' : 'url(#blueGrad)'}
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseMove={(e) => showTooltip('month', idx, e, m.label, `${m.count} Interviews`)}
                    onMouseLeave={hideTooltip}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={height - padding + 15}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredChart === 'month' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 2. SELECTED VS REJECTED DONUT CHART ---
  const SelectedRejectedChart = () => {
    const stats = data.statusWise || [
      { label: 'Shortlisted', count: 18, color: '#38a169', grad: 'url(#greenGrad)' },
      { label: 'Not Shortlisted', count: 12, color: '#e53e3e', grad: 'url(#redGrad)' },
      { label: 'Pending Review', count: 6, color: '#d69e2e', grad: 'url(#orangeGrad)' }
    ];

    const total = stats.reduce((acc, s) => acc + s.count, 0) || 1;
    const size = 180;
    const r = 55;
    const circ = 2 * Math.PI * r;
    let accumulatedPercent = 0;

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Candidate Status Ratio</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click segments to filter)</span>
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
            <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: 'auto', transform: 'rotate(-90deg)' }}>
              {stats.map((s, idx) => {
                const percent = s.count / total;
                const strokeDashoffset = circ - (percent * circ);
                const strokeDasharray = `${circ} ${circ}`;
                const rotation = (accumulatedPercent * 360);
                accumulatedPercent += percent;
                const isHovered = hoveredChart === 'status' && hoveredIdx === idx;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={isHovered ? 26 : 20}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                    style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onClick={() => onDrillDown('status', s.label)}
                    onMouseMove={(e) => showTooltip('status', idx, e, s.label, `${s.count} Candidates (${Math.round(percent * 100)}%)`)}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}
              {/* Inner hole */}
              <circle cx={size / 2} cy={size / 2} r={r - 12} fill="#ffffff" />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{total}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Evaluations</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '100px' }}>
            {stats.map((s, idx) => (
              <div
                key={idx}
                onClick={() => onDrillDown('status', s.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color, flexShrink: 0 }}></div>
                <div style={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {s.label}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{s.count}</div>
              </div>
            ))}
          </div>

          {hoveredChart === 'status' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 3. ROLE-WISE CANDIDATE CHART (HORIZONTAL BARS) ---
  const RoleWiseChart = () => {
    const roles = data.roleWise || [
      { label: 'Software Engineer', count: 15 },
      { label: 'Python Developer', count: 10 },
      { label: 'React Developer', count: 8 },
      { label: 'QA Automation', count: 5 }
    ];

    const maxCount = Math.max(...roles.map(r => r.count), 1);
    const height = 180;
    const width = 280;
    const padding = 30;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2 - 30;
    const barHeight = chartHeight / roles.length - 8;

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Role-wise Candidates</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click roles to filter)</span>
        </h4>
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {roles.map((r, idx) => {
              const barWidth = (r.count / maxCount) * chartWidth;
              const y = padding + idx * (chartHeight / roles.length) + 4;
              const isHovered = hoveredChart === 'role' && hoveredIdx === idx;
              const shortLabel = r.label.length > 14 ? r.label.substring(0, 11) + '...' : r.label;

              return (
                <g key={idx} cursor="pointer" onClick={() => onDrillDown('role', r.label)}>
                  <text
                    x={5}
                    y={y + barHeight / 2 + 4}
                    fill="var(--text-secondary)"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {shortLabel}
                  </text>
                  <rect
                    x={85}
                    y={y}
                    width={Math.max(barWidth, 4)}
                    height={barHeight}
                    rx="3"
                    fill={isHovered ? 'url(#purpleGrad)' : 'url(#tealGrad)'}
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseMove={(e) => showTooltip('role', idx, e, r.label, `${r.count} Candidates`)}
                    onMouseLeave={hideTooltip}
                  />
                  <text
                    x={85 + Math.max(barWidth, 4) + 6}
                    y={y + barHeight / 2 + 4}
                    fill="var(--text-secondary)"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    {r.count}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredChart === 'role' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 4. SCORE DISTRIBUTION CHART ---
  const ScoreDistributionChart = () => {
    const brackets = data.scoreWise || [
      { label: '<50%', count: 4, range: [0, 50] },
      { label: '50-70%', count: 12, range: [50, 70] },
      { label: '70-90%', count: 16, range: [70, 90] },
      { label: '90%+', count: 6, range: [90, 100] }
    ];

    const maxCount = Math.max(...brackets.map(b => b.count), 1);
    const height = 180;
    const width = 280;
    const padding = 30;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const barWidth = chartWidth / brackets.length - 12;

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Score Distribution</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click score brackets)</span>
        </h4>
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
              <line
                key={idx}
                x1={padding}
                y1={padding + chartHeight * (1 - val)}
                x2={width - padding}
                y2={padding + chartHeight * (1 - val)}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
            {brackets.map((b, idx) => {
              const barHeight = (b.count / maxCount) * chartHeight;
              const x = padding + idx * (chartWidth / brackets.length) + 6;
              const y = padding + chartHeight - barHeight;
              const isHovered = hoveredChart === 'score' && hoveredIdx === idx;

              return (
                <g key={idx} cursor="pointer" onClick={() => onDrillDown('score', b.range)}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 4)}
                    rx="4"
                    fill={isHovered ? 'url(#purpleGrad)' : 'url(#orangeGrad)'}
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseMove={(e) => showTooltip('score', idx, e, `Score Range ${b.label}`, `${b.count} Candidates`)}
                    onMouseLeave={hideTooltip}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={height - padding + 15}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredChart === 'score' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 5. CONFIDENCE LEVEL CHART (DONUT) ---
  const ConfidenceLevelChart = () => {
    const levels = data.confidenceWise || [
      { label: 'High Confidence', count: 18, color: '#319795' },
      { label: 'Moderate Confidence', count: 14, color: '#4299e1' },
      { label: 'Low Confidence', count: 4, color: '#e53e3e' }
    ];

    const total = levels.reduce((acc, l) => acc + l.count, 0) || 1;
    const size = 180;
    const r = 55;
    const circ = 2 * Math.PI * r;
    let accumulatedPercent = 0;

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Confidence Profile</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click segments to filter)</span>
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
            <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: 'auto', transform: 'rotate(-90deg)' }}>
              {levels.map((l, idx) => {
                const percent = l.count / total;
                const strokeDashoffset = circ - (percent * circ);
                const strokeDasharray = `${circ} ${circ}`;
                const rotation = (accumulatedPercent * 360);
                accumulatedPercent += percent;
                const isHovered = hoveredChart === 'confidence' && hoveredIdx === idx;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={l.color}
                    strokeWidth={isHovered ? 26 : 20}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                    style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onClick={() => onDrillDown('confidence', l.label)}
                    onMouseMove={(e) => showTooltip('confidence', idx, e, l.label, `${l.count} Candidates (${Math.round(percent * 100)}%)`)}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}
              <circle cx={size / 2} cy={size / 2} r={r - 12} fill="#ffffff" />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{total}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Evaluated</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '100px' }}>
            {levels.map((l, idx) => (
              <div
                key={idx}
                onClick={() => onDrillDown('confidence', l.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color, flexShrink: 0 }}></div>
                <div style={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {l.label}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{l.count}</div>
              </div>
            ))}
          </div>

          {hoveredChart === 'confidence' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 6. RECENT EVALUATIONS TREND CHART (LINE CHART) ---
  const RecentTrendChart = () => {
    const trend = data.recentTrend || [
      { date: '24 May', count: 2 },
      { date: '25 May', count: 5 },
      { date: '26 May', count: 4 },
      { date: '27 May', count: 8 },
      { date: '28 May', count: 6 },
      { date: '29 May', count: 10 }
    ];

    const maxCount = Math.max(...trend.map(t => t.count), 1);
    const height = 180;
    const width = 280;
    const padding = 30;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const points = trend.map((t, idx) => {
      const x = padding + idx * (chartWidth / (trend.length - 1 || 1));
      const y = padding + chartHeight - (t.count / maxCount) * chartHeight;
      return { x, y, ...t };
    });

    const dPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="card" style={{ position: 'relative', margin: 0, padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Daily Evaluation Trend</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Click nodes to drill-down)</span>
        </h4>
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
              <line
                key={idx}
                x1={padding}
                y1={padding + chartHeight * (1 - val)}
                x2={width - padding}
                y2={padding + chartHeight * (1 - val)}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
            {/* Main trend line */}
            <path
              d={dPath}
              fill="none"
              stroke="#9f7aea"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Interactive nodes */}
            {points.map((p, idx) => {
              const isHovered = hoveredChart === 'trend' && hoveredIdx === idx;
              return (
                <g key={idx} cursor="pointer" onClick={() => onDrillDown('trend', p.date)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 7 : 5}
                    fill="#9f7aea"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseMove={(e) => showTooltip('trend', idx, e, p.date, `${p.count} Submissions`)}
                    onMouseLeave={hideTooltip}
                  />
                  <text
                    x={p.x}
                    y={height - padding + 15}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize="8.5"
                    fontWeight="600"
                  >
                    {p.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredChart === 'trend' && (
            <div style={{
              position: 'absolute',
              left: hoveredPos.x,
              top: hoveredPos.y,
              background: 'rgba(26,32,44,0.95)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <strong>{hoveredPos.label}</strong>: {hoveredPos.value}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <ChartGradients />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <MonthWiseChart />
        <SelectedRejectedChart />
        <RoleWiseChart />
        <ScoreDistributionChart />
        <ConfidenceLevelChart />
        <RecentTrendChart />
      </div>
    </>
  );
}

export default DrillDownCharts;
