import PropTypes from 'prop-types';
import { CATEGORY_CONFIG, RESULT_CONFIG } from './auditConfig';

const categories = Object.keys(CATEGORY_CONFIG);
const results = Object.keys(RESULT_CONFIG);

export default function AuditLogFilters({ filters, onChange }) {
    const update = (key, val) => onChange({ ...filters, [key]: val });

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
        }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#F1F5F9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</h3>

            <div>
                <label htmlFor="audit-filter-search" style={labelStyle}>Search</label>
                <input
                    id="audit-filter-search"
                    type="text"
                    placeholder="Action, resource, IP..."
                    value={filters.search || ''}
                    onChange={e => update('search', e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div>
                <label htmlFor="audit-filter-category" style={labelStyle}>Category</label>
                <select id="audit-filter-category" value={filters.category || ''} onChange={e => update('category', e.target.value)} style={inputStyle}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-result" style={labelStyle}>Result</label>
                <select id="audit-filter-result" value={filters.result || ''} onChange={e => update('result', e.target.value)} style={inputStyle}>
                    <option value="">All Results</option>
                    {results.map(r => <option key={r} value={r}>{RESULT_CONFIG[r].label}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor="audit-filter-start-date" style={labelStyle}>Start Date</label>
                <input id="audit-filter-start-date" type="date" value={filters.startDate || ''} onChange={e => update('startDate', e.target.value)} style={inputStyle} />
            </div>

            <div>
                <label htmlFor="audit-filter-end-date" style={labelStyle}>End Date</label>
                <input id="audit-filter-end-date" type="date" value={filters.endDate || ''} onChange={e => update('endDate', e.target.value)} style={inputStyle} />
            </div>

            <div>
                <label htmlFor="audit-filter-ip" style={labelStyle}>IP Address</label>
                <input
                    id="audit-filter-ip"
                    type="text"
                    placeholder="Filter by IP..."
                    value={filters.ipAddress || ''}
                    onChange={e => update('ipAddress', e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => onChange({})} style={resetBtnStyle}>Reset</button>
            </div>
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px', fontWeight: 500 };
const inputStyle = {
    width: '100%', padding: '8px 10px', fontSize: '13px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', color: '#F1F5F9', outline: 'none', boxSizing: 'border-box',
};
const resetBtnStyle = {
    flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', color: '#94A3B8', cursor: 'pointer',
};

AuditLogFilters.propTypes = {
    filters: PropTypes.shape({
        search: PropTypes.string,
        category: PropTypes.string,
        result: PropTypes.string,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        ipAddress: PropTypes.string,
    }),
    onChange: PropTypes.func.isRequired,
};


