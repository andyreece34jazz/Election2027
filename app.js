const SUPABASE_URL = "https://slewytwwohwfxsyasorw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXd5dHd3b2h3ZnhzeWFzb3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDQ3NDcsImV4cCI6MjEwNTU4MDc0N30.MRBpz7VtXN1cv6tWet5BCSGBkO_USJpsVlCfn648GFc";

let allLgasData = []; 
let allStatesData = []; 
let nationalTotalPUs = 176846; // Default true national total

const fmt = (num) => (num === null || num === undefined) ? "—" : Number(num).toLocaleString("en-GB");
const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

async function fetchSupabase(view) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${view}?select=*`, {
        headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!response.ok) throw new Error(`Error fetching ${view}`);
    return response.json();
}

window.updateState = function() {
    try {
        const stateSelect = document.getElementById("state-select");
        const lgaSelect = document.getElementById("lga-select");
        const dynamicTitle = document.getElementById("dynamic-state-title");
        const metricsBody = document.getElementById("metrics-body");
        const stateName = stateSelect.value;

        if (!stateName) {
            dynamicTitle.textContent = 'State Estimates';
            metricsBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 32px; color: #9CA3AF;">Select a state to view estimates</td></tr>';
            lgaSelect.innerHTML = '<option value="">Select a state first</option>';
            lgaSelect.disabled = true;
            updateSummaryBlock(0, 0);
            return;
        }

        dynamicTitle.textContent = `${toTitleCase(stateName)} Estimates`;
        metricsBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 32px; color: #9CA3AF;">Loading data...</td></tr>';

        const lgaData = allLgasData.filter(lga => 
            (lga.state_name || "").toLowerCase() === stateName.toLowerCase()
        );

        lgaSelect.innerHTML = '<option value="">All LGAs</option>';
        lgaSelect.disabled = false;
        
        lgaData.sort((a,b) => (a.lga_name || "").localeCompare(b.lga_name || ""));
        lgaData.forEach(lga => {
            const opt = document.createElement("option");
            opt.value = lga.lga_name;
            opt.textContent = toTitleCase(lga.lga_name);
            lgaSelect.appendChild(opt);
        });

        const stateInfo = allStatesData.find(s => (s.state_name || "").toLowerCase() === stateName.toLowerCase());
        const trueStateTotal = stateInfo ? (stateInfo.total_polling_units || 0) : 0;

        renderMetrics(lgaData, trueStateTotal);

    } catch (err) {
        console.error("State change error:", err);
        alert("Error updating state: " + err.message);
    }
};

window.updateLga = function() {
    try {
        const stateSelect = document.getElementById("state-select");
        const lgaSelect = document.getElementById("lga-select");
        const stateName = stateSelect.value;
        const selectedLga = lgaSelect.value;

        if (!stateName) return;

        const lgaData = allLgasData.filter(lga => 
            (lga.state_name || "").toLowerCase() === stateName.toLowerCase() &&
            (selectedLga === "" || lga.lga_name === selectedLga)
        );
        
        if (selectedLga === "") {
            // Revert to true state total
            const stateInfo = allStatesData.find(s => (s.state_name || "").toLowerCase() === stateName.toLowerCase());
            const trueStateTotal = stateInfo ? (stateInfo.total_polling_units || 0) : 0;
            renderMetrics(lgaData, trueStateTotal);
        } else {
            // Calculate total from just the selected LGA
            renderMetrics(lgaData, null);
        }
    } catch (err) {
        console.error("LGA change error:", err);
    }
};

async function init() {
    try {
        const [nationalData, stateData, lgaData] = await Promise.all([
            fetchSupabase("public_national_results"),
            fetchSupabase("public_state_results"),
            fetchSupabase("public_lga_results")
        ]);

        allLgasData = lgaData || [];
        allStatesData = stateData || []; 

        if (nationalData && nationalData.length > 0) {
            const result = nationalData[0];
            
            // DO NOT sum the states. Only use the DB value if it's explicitly provided and realistic.
            if (result.total_polling_units && result.total_polling_units > 10000) {
                nationalTotalPUs = result.total_polling_units;
            }

            const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
            
            setTxt("dash-coverage-text", `${fmt(result.verified_polling_units)} of ${fmt(nationalTotalPUs)}`);
            setTxt("dash-registered", fmt(result.registered_voters));
            setTxt("dash-accredited", fmt(result.accredited_voters));
            setTxt("dash-valid", fmt(result.total_valid_votes));
            setTxt("dash-rejected", fmt(result.rejected_votes));
            setTxt("dash-apc", fmt(result.apc));
            setTxt("dash-pdp", fmt(result.pdp));
            setTxt("dash-adc", fmt(result.adc));
            setTxt("dash-ndc", fmt(result.ndc));

            const pctValue = ((result.verified_polling_units / nationalTotalPUs) * 100).toFixed(1);
            const pctBadge = document.getElementById("dash-coverage-pct");
            if (pctBadge) {
                pctBadge.textContent = `${pctValue}%`;
                const safeLeft = Math.min(Math.max(pctValue, 0), 95); 
                pctBadge.style.left = `calc(${safeLeft}% - 16px)`;
            }
        }

        const stateSelect = document.getElementById("state-select");
        if (stateData && stateData.length > 0) {
            stateSelect.innerHTML = '<option value="">Select a state</option>';
            stateData.sort((a, b) => (a.state_name || "").localeCompare(b.state_name || ""));
            stateData.forEach(row => {
                const opt = document.createElement("option");
                opt.value = row.state_name; 
                opt.textContent = toTitleCase(row.state_name); 
                stateSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Initial load error:", err);
        const stateSelect = document.getElementById("state-select");
        if (stateSelect) stateSelect.innerHTML = '<option value="">Error loading states</option>';
    }
}

function renderMetrics(lgas, stateTotalOverride = null) {
    const metricsBody = document.getElementById("metrics-body");
    if (!lgas || !lgas.length) {
        metricsBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 32px; color: #9CA3AF;">No reviewed polling units found for this selection.</td></tr>';
        updateSummaryBlock(0, 0);
        return;
    }

    let totalVerifiedPUs = 0;
    let totalStatePUs = stateTotalOverride !== null ? stateTotalOverride : 0;

    metricsBody.innerHTML = lgas.map(r => {
        totalVerifiedPUs += (r.verified_polling_units || 0);
        
        if (stateTotalOverride === null) {
            totalStatePUs += (r.total_polling_units || 0);
        }

        return `
            <tr>
                <td class="lga-name">${toTitleCase(r.lga_name)}</td>
                <td>${fmt(r.registered_voters)}</td>
                <td>${fmt(r.accredited_voters)}</td>
                <td>${fmt(r.total_valid_votes)}</td>
                <td>${fmt(r.rejected_votes)}</td>
                <td>${fmt(r.apc)}</td>
                <td>${fmt(r.pdp)}</td>
                <td>${fmt(r.adc)}</td>
                <td>${fmt(r.ndc)}</td>
            </tr>
        `;
    }).join("");

    updateSummaryBlock(totalVerifiedPUs, totalStatePUs);
}

function updateSummaryBlock(verified, total) {
    const estCoverageText = document.getElementById("est-coverage-text");
    const estCoveragePct = document.getElementById("est-coverage-pct");
    const estProgressFill = document.getElementById("est-progress-fill");

    if (!estCoverageText || !estCoveragePct || !estProgressFill) return;

    estCoverageText.innerHTML = `${fmt(verified)} <span>of</span> ${fmt(total)}`;
    
    const percentage = total > 0 ? (verified / total) * 100 : 0;
    const formattedPct = percentage.toFixed(1) + "%";
    
    estCoveragePct.textContent = formattedPct;
    estProgressFill.style.width = `${Math.min(percentage, 100)}%`;
}

init();
