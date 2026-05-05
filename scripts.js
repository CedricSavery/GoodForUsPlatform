/**
 * PROPERTY OF SOLUTIONSAE - GOODFORUS FINTECH
 * DEVELOPER: Cedric Savery
 * STATUS: ACTIVE DEVELOPMENT / PROPRIETARY
 * * NOTICE: This file contains unfinished proprietary fundraising logic.
 * Unauthorized access or duplication is strictly prohibited.
 * (c) 2026 SolutionsAe
 */


function sync() {
    const color = document.getElementById('in-color').value;
    const parent = document.getElementById('in-parent').value;
    const title = document.getElementById('in-title').value;
    const story = document.getElementById('in-story').value;
    const goal = document.getElementById('in-goal').value;
    const urlImg = document.getElementById('in-img').value;
    const vidUrl = document.getElementById('in-vid').value;

    document.documentElement.style.setProperty('--accent', color);
    document.getElementById('v-parent').innerText = parent;
    document.getElementById('v-title').innerText = title;
    document.getElementById('v-story').innerText = story;
    document.getElementById('v-goal').innerText = "$" + Number(goal).toLocaleString();
    
    // Media Logic
    const hero = document.getElementById('v-hero-container');
    const overlay = document.getElementById('v-brand-overlay');
    if (mediaMode === 'video' && vidUrl.length > 5) {
        let embedUrl = vidUrl;
        if(vidUrl.includes('v=')) embedUrl = "https://www.youtube.com/embed/" + vidUrl.split('v=')[1].split('&')[0];
        hero.innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
        hero.appendChild(overlay);
    } else if (mediaMode === 'image') {
        if(!hero.querySelector('img#v-img')) hero.innerHTML = `<img id="v-img" src="">`;
        if(urlImg.length > 5) document.getElementById('v-img').src = urlImg;
        hero.appendChild(overlay);
    }

    // Donation & Top Donor Logic
    let total = 0;
    let topDonor = null;

    donorData.forEach(d => {
        total += d.amt;
        if (!topDonor || d.amt > topDonor.amt) {
            topDonor = d;
        }
    });

    // Update Top Donor Display
    const topBox = document.getElementById('top-donor-display');
    if (topDonor) {
        topBox.classList.remove('hidden');
        document.getElementById('top-donor-name').innerText = topDonor.name;
        document.getElementById('top-donor-amount').innerText = topDonor.amt.toLocaleString();
    } else {
        topBox.classList.add('hidden');
    }
    
    document.getElementById('v-raised').innerText = "$" + total.toLocaleString();
    document.getElementById('v-bar').style.width = Math.min((total/goal)*100, 100) + "%";
    document.getElementById('v-count').innerText = donorData.length + " donations";

    // Push to LocalStorage for the live site
    localStorage.setItem('gfm_campaign_data', JSON.stringify({
        color, parent, title, story, goal, 
        imgUrl: document.getElementById('v-img')?.src || "", 
        vidUrl, mediaMode, totalRaised: total, 
        donationCount: donorData.length, donors: donorData,
        topDonor: topDonor // Added this so P2P.html can read it easily
    }));
}

function addDonor() {
    const nameInput = document.getElementById('sim-name');
    const amtInput = document.getElementById('sim-amt');
    const amt = parseFloat(amtInput.value) || 0;
    if(amt <= 0) return;

    // Just push to data; sync() now handles finding the "Top" one automatically
    donorData.unshift({ name: (nameInput.value || "Supporter"), amt: amt });
    
    renderList();
    sync();
    
    nameInput.value = ""; 
    amtInput.value = "";
}