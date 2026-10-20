const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

const nationalStatus = document.getElementById("national-status");
const nationalResults = document.getElementById("national-results");
const stateSelect = document.getElementById("state-select");
const stateResults = document.getElementById("state-results");
const lgaResults = document.getElementById("lga-results");

async function fetchSupabase(view) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${view}?select=*`,
        {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(`${view}: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

function formatNumber(value) {
    if (value === null || value === undefined) {
        return "—";
    }
    return Number(value).toLocaleString("en-GB");
}

function formatPercent(part, total) {
    if (!total || total === 0) return "0.0";
    return ((part / total) * 100).toFixed(1);
}

function figure(label, value) {
    const val = formatNumber(value);
    const isDash = (val === "—");
    return `
        <div class="figure">
            <span class="label">${label}</span>
            <span class="value ${isDash ? 'dash' : ''}">${val}</span>
        </div>
    `;
}

function renderNational(data) {
    if (!data.length) {
        nationalStatus.textContent = "National projection unavailable. State and LGA estimates are shown below.";
        return;
    }

    const result = data[0];
    nationalStatus.textContent = "Estimates based on figures received and checked so far.";

    nationalResults.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>National Estimates</h3>
                    <span class="not-official">Estimated Figures - Not Official</span>
                </div>
                <div class="coverage-block">
                    <div class="pct">${formatNumber(result.verified_polling_units)}</div>
                    <div class="label">Polling units covered</div>
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
        </div>
    `;
}

function populateStates(data) {
    stateSelect.innerHTML = '<option value="">Select a state</option>';

    data.forEach(state => {
        const option = document.createElement("option");
        option.value = state.state_name;
        option.textContent = state.state_name;
        stateSelect.appendChild(option);
    });
}

function renderState(data, stateName) {
    const s = data.find(item => item.state_name === stateName);

    if (!s) {
        stateResults.innerHTML = "";
        return;
    }

    const totalPUs = s.total_polling_units || 0;
    const covPercent = formatPercent(s.verified_polling_units, totalPUs);

    // 10% Threshold logic
    if (parseFloat(covPercent) < 10) {
        stateResults.innerHTML = `
            <div class="coverage-warn">
                <strong>${s.state_name} State Estimate — insufficient coverage</strong>
                ${formatNumber(s.verified_polling_units)} of ${formatNumber(totalPUs)} polling units estimated (${covPercent}%).
                A state estimate is published at 10% coverage. LGA estimates are shown below.
            </div>
        `;
        return; // Exit early so we don't render the full card
    }

    // Render full card if coverage >= 10%
    stateResults.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>${s.state_name} State</h3>
                    <span class="not-official">Estimated Figures - Not Official</span>
                </div>
                <div class="coverage-block">
                    <div class="pct">${covPercent}%</div>
                    <div class="label">Polling-unit coverage</div>
                    <div class="label">${formatNumber(s.verified_polling_units)} of ${formatNumber(totalPUs)} polling units</div>
                </div>
            </div>

            <hr style="border: 0; border-top: 1px solid #dfe4e8; margin: 16px 0;">

            <div class="figures">
                ${figure("APC", s.apc)}
                ${figure("PDP", s.pdp)}
                ${figure("ADC", s.adc)}
                ${figure("NDC", s.ndc)}
            </div>

            <div class="figures" style="margin-bottom: 0;">
                ${figure("Registered voters", s.registered_voters)}
                ${figure("Accredited voters", s.accredited_voters)}
                ${figure("Valid votes", s.total_valid_votes)}
                ${figure("Rejected votes", s.rejected_votes)}
            </div>

            <div class="meta">
                <p><strong>${formatNumber(s.sources_matched) || '—'}</strong> sources matched · <strong>${formatNumber(s.single_source) || '—'}</strong> single-source</p>
                <p style="margin-bottom:0;">
                    Estimates based on polling-unit figures received so far. Coverage is not a full state count. These figures are not official results or an INEC declaration. For official results, visit the <a href="https://inecelectionresults.ng/" target="_blank" rel="noopener noreferrer">INEC Election Results Portal ↗</a>.
                </p>
            </div>
        </div>
    `;
}

function renderLGAs(data, stateName) {
    const rows = data.filter(item => item.state_name === stateName);

    if (!rows.length) {
        lgaResults.innerHTML = '<div class="empty-state">No LGA estimates available for this state yet.</div>';
        return;
    }

    const tableRows = rows.map(r => {
        const totalPUs = r.total_polling_units || 0;
        const covPercent = formatPercent(r.verified_polling_units, totalPUs);
        
        return `
            <tr>
                <td style="text-align: left;">${r.lga_name}</td>
                <td style="text-align: right;">${formatNumber(r.apc)}</td>
                <td style="text-align: right;">${formatNumber(r.pdp)}</td>
                <td style="text-align: right;" class="${r.adc == null ? 'dash' : ''}">${formatNumber(r.adc)}</td>
                <td style="text-align: right;" class="${r.ndc == null ? 'dash' : ''}">${formatNumber(r.ndc)}</td>
                <td style="text-align: right;">
                    <strong>${covPercent}%</strong><br>
                    <span style="font-size:0.75rem; color:var(--muted); font-weight: normal;">${formatNumber(r.verified_polling_units)} / ${formatNumber(totalPUs)}</span>
                </td>
            </tr>
        `;
    }).join("");

    lgaResults.innerHTML = `
        <div class="table-wrap" style="margin-top:20px;">
            <table class="lga-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">LGA</th>
                        <th style="text-align: right;">APC</th>
                        <th style="text-align: right;">PDP</th>
                        <th style="text-align: right;">ADC</th>
                        <th style="text-align: right;">NDC</th>
                        <th style="text-align: right;">Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <div class="meta" style="padding:12px 0 0; border:none; font-size:0.85rem; color:var(--muted);">
            <p style="margin:0;">
                Estimates based on polling-unit figures received so far. Not a full count. 
                For official results, visit the <a href="https://inecelectionresults.ng/" target="_blank" rel="noopener noreferrer">INEC Election Results Portal ↗</a>.
            </p>
        </div>
    `;
}

async function initialise() {
    try {
        const [national, states, lgas] = await Promise.all([
            fetchSupabase("public_national_results"),
            fetchSupabase("public_state_results"),
            fetchSupabase("public_lga_results")
        ]);

        renderNational(national);
        populateStates(states);

        stateSelect.addEventListener("change", () => {
            const stateName = stateSelect.value;

            if (!stateName) {
                stateResults.innerHTML = "";
                lgaResults.innerHTML = '<div class="empty-state">Select a state above to view LGA estimates.</div>';
                return;
            }

            renderState(states, stateName);
            renderLGAs(lgas, stateName);
        });

    } catch (error) {
        console.error(error);
        nationalStatus.innerHTML = `<div class="error">Unable to load figures. Please try again later.</div>`;
    }
}

initialise();
