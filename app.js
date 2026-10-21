const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

const stateSelect = document.getElementById("state-select");
const lgaSelect = document.getElementById("lga-select");
const lgaBreakdown = document.getElementById("lga-breakdown");
const lgaTableBody = document.getElementById("lga-table-body");

const fmt = (num) => (num === null || num === undefined) ? "—" : Number(num).toLocaleString("en-GB");
const pct = (part, total) => (total && total > 0) ? ((part / total) * 100).toFixed(1) + "%" : "0.0%";

async function fetchSupabase(view) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${view}?select=*`, {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!response.ok) throw new Error(`Error ${view}`);
    return response.json();
}

// 1. Load Federal Dashboard
async function loadDashboard() {
    try {
        const [data, stateData] = await Promise.all([
            fetchSupabase("public_national_results"),
            fetchSupabase("public_state_results") // Just to get total PUs or assume a fixed number
        ]);
        
        if (!data.length) return;
        const result = data[0];

        // Calculate total PUs from state data (sum of total_polling_units)
        let totalPUs = 176846; 
        if (stateData.length > 0) {
            totalPUs = stateData.reduce((acc, curr) => acc + (curr.total_polling_units || 0), 0);
        }

        // Update text fields
        document.getElementById("dash-coverage").textContent = `${fmt(result.verified_polling_units)} out of ${fmt(totalPUs)}`;
        document.getElementById("dash-registered").textContent = fmt(result.registered_voters);
        document.getElementById("dash-accredited").textContent = fmt(result.accredited_voters);
        document.getElementById("dash-valid").textContent = fmt(result.total_valid_votes);
        document.getElementById("dash-rejected").textContent = fmt(result.rejected_votes);
        
        document.getElementById("dash-apc").textContent = fmt(result.apc);
        document.getElementById("dash-pdp").textContent = fmt(result.pdp);
        document.getElementById("dash-adc").textContent = fmt(result.adc);
        document.getElementById("dash-ndc").textContent = fmt(result.ndc);

    } catch (err) {
        console.error("Dashboard error", err);
    }
}

// 2. Load States
async function loadStates() {
    try {
        const data = await fetchSupabase("public_state_results");
        stateSelect.innerHTML = '<option value="">Select State</option>';
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

// 3. Handle State Change
stateSelect.addEventListener("change", async () => {
    const stateName = stateSelect.value;
    lgaBreakdown.style.display = "none";
    lgaSelect.innerHTML = '<option value="">Select LGA (Optional)</option>';
    lgaSelect.disabled = true;

    if (!stateName) return;

    try {
        const lgaData = await fetchSupabase(`public_lga_results?state_name=eq.${encodeURIComponent(stateName)}`);
        
        // Populate LGA Dropdown
        lgaSelect.innerHTML = '<option value="">All LGAs (shown below)</option>';
        lgaData.forEach(lga => {
            const opt = document.createElement("option");
            opt.value = lga.lga_name;
            opt.textContent = lga.lga_name;
            lgaSelect.appendChild(opt);
        });
        lgaSelect.disabled = false;

        // Render Table
        renderLGATable(lgaData);

    } catch (err) {
        console.error(err);
    }
});

// 4. Render LGA Table
function renderLGATable(lgas) {
    if (!lgas.length) {
        lgaBreakdown.style.display = "none";
        return;
    }

    lgaTableBody.innerHTML = lgas.map(r => {
        const total = r.total_polling_units || 0;
        const cov = pct(r.verified_polling_units, total);
        
        return `
            <tr>
                <td style="font-weight: 500;">${r.lga_name}</td>
                <td class="num">${fmt(r.apc)}</td>
                <td class="num">${fmt(r.pdp)}</td>
                <td class="num">${fmt(r.adc)}</td>
                <td class="num">${fmt(r.ndc)}</td>
                <td class="num" style="font-weight: 600;">
                    ${cov}<br>
                    <span style="font-size: 11px; font-weight: 400; color: var(--muted);">${fmt(r.verified_polling_units)} / ${fmt(total)}</span>
                </td>
            </tr>
        `;
    }).join("");

    lgaBreakdown.style.display = "block";
}

// Initialize
loadDashboard();
loadStates();
