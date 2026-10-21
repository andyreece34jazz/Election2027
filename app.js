const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

const nationalResults = document.getElementById("national-results");
const stateSelect = document.getElementById("state-select");
const lgaSelect = document.getElementById("lga-select");
const detailResults = document.getElementById("detail-results");

async function fetchSupabase(view) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${view}?select=*`, {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!response.ok) throw new Error(`${view}: ${response.status}`);
    return response.json();
}

function formatNumber(value) {
    return (value === null || value === undefined) ? "—" : Number(value).toLocaleString("en-GB");
}

function formatPercent(part, total) {
    if (!total || total === 0) return "0.0";
    return ((part / total) * 100).toFixed(1);
}

function figure(label, value) {
    const val = formatNumber(value);
    return `<div class="figure"><span class="label">${label}</span><span class="value ${val === '—' ? 'dash' : ''}">${val}</span></div>`;
}

// Render National Dashboard
function renderNational(data) {
    if (!data.length) return;
    const result = data[0];

    nationalResults.innerHTML = `
        <div class="card-header">
            <div>
                <h3>Federal Estimates</h3>
                <span class="not-official">Estimated Figures - Not Official</span>
            </div>
            <div class="coverage-block">
                <div class="pct">${formatNumber(result.verified_polling_units)}</div>
                <div class="label">Total Polling Units Verified</div>
            </div>
        </div>
        <hr style="border: 0; border-top: 1px solid var(--line); margin: 16px 0;">
        <div class="figures">
            ${figure("APC", result.apc)}
            ${figure("PDP", result.pdp)}
            ${figure("ADC", result.adc)}
            ${figure("NDC", result.ndc)}
        </div>
        <div class="figures" style="margin-bottom: 0;">
            ${figure("Registered voters", result.registered_voters)}
            ${figure("Accredited voters", result.accredited_voters)}
            ${figure("Valid votes", result.total_valid_votes)}
            ${figure("Rejected votes", result.rejected_votes)}
        </div>
    `;
}

// Load States
async function loadStates() {
    try {
        const data = await fetchSupabase("public_state_results");
        stateSelect.innerHTML = '<option value="">Select a State</option>';
        data.forEach(row => {
            const opt = document.createElement("option");
            opt.value = row.state_name;
            opt.textContent = row.state_name;
            stateSelect.appendChild(opt);
        });
    } catch (err) {
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
    }
}

// Load State Data & LGAs when a state is selected
stateSelect.addEventListener("change", async () => {
    const stateName = stateSelect.value;
    detailResults.innerHTML = "";
    lgaSelect.innerHTML = '<option value="">Loading LGAs...</option>';
    lgaSelect.disabled = true;

    if (!stateName) return;

    try {
        const [stateData, lgaData] = await Promise.all([
            fetchSupabase("public_state_results"),
            fetchSupabase("public_lga_results")
        ]);

        const s = stateData.find(item => item.state_name === stateName);
        const lgas = lgaData.filter(item => item.state_name === stateName);

        // Populate LGA Dropdown
        lgaSelect.innerHTML = '<option value="">Select an LGA (All shown below)</option>';
        lgas.forEach(lga => {
            const opt = document.createElement("option");
            opt.value = lga.lga_name;
            opt.textContent = lga.lga_name;
            lgaSelect.appendChild(opt);
        });
        lgaSelect.disabled = false;

        // Render State Summary & LGA Table
        let html = "";
        
        if (s) {
            const totalPUs = s.total_polling_units || 0;
            const covPercent = formatPercent(s.verified_polling_units, totalPUs);
            
            if (parseFloat(covPercent) < 10) {
                html += `<div class="coverage-warn">
                    <strong>${s.state_name} State Estimate — insufficient coverage</strong>
                    ${formatNumber(s.verified_polling_units)} of ${formatNumber(totalPUs)} polling units estimated (${covPercent}%). LGA estimates are shown below.
                </div>`;
            } else {
                html += `
                <div class="card" style="margin-bottom: 24px; background: #fafbfc;">
                    <div class="card-header">
                        <div>
                            <h3>${s.state_name} State Estimate</h3>
                            <span class="not-official">Estimated Figures - Not Official</span>
                        </div>
                        <div class="coverage-block">
                            <div class="pct">${covPercent}%</div>
                            <div class="label">${formatNumber(s.verified_polling_units)} of ${formatNumber(totalPUs)} polling units</div>
                        </div>
                    </div>
                    <div class="figures" style="margin-top: 16px;">
                        ${figure("APC", s.apc)}
                        ${figure("PDP", s.pdp)}
                        ${figure("ADC", s.adc)}
                        ${figure("NDC", s.ndc)}
                    </div>
                </div>`;
            }
        }

        // Render LGA Table
        if (lgas.length > 0) {
            html += `
            <h4>LGA Breakdown</h4>
            <div class="table-wrap">
                <table class="lga-table">
                    <thead>
                        <tr>
                            <th>LGA</th>
                            <th style="text-align: right;">APC</th>
                            <th style="text-align: right;">PDP</th>
                            <th style="text-align: right;">ADC</th>
                            <th style="text-align: right;">NDC</th>
                            <th style="text-align: right;">Coverage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lgas.map(r => {
                            const total = r.total_polling_units || 0;
                            const cov = formatPercent(r.verified_polling_units, total);
                            return `
                            <tr>
                                <td>${r.lga_name}</td>
                                <td style="text-align: right;">${formatNumber(r.apc)}</td>
                                <td style="text-align: right;">${formatNumber(r.pdp)}</td>
                                <td style="text-align: right;">${formatNumber(r.adc)}</td>
                                <td style="text-align: right;">${formatNumber(r.ndc)}</td>
                                <td style="text-align: right;">
                                    <strong>${cov}%</strong><br>
                                    <span style="font-size:0.75rem; color:var(--muted);">${formatNumber(r.verified_polling_units)} / ${formatNumber(total)}</span>
                                </td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>`;
        } else {
            html += `<div class="empty-state">No LGA data available for this state yet.</div>`;
        }

        detailResults.innerHTML = html;

    } catch (err) {
        console.error(err);
        detailResults.innerHTML = `<div class="error">Failed to load state data.</div>`;
    }
});

// Initialize Dashboard
async function init() {
    try {
        const national = await fetchSupabase("public_national_results");
        renderNational(national);
        await loadStates();
    } catch (err) {
        nationalResults.innerHTML = `<div class="error">Unable to load estimates. Please try again later.</div>`;
    }
}

init();
