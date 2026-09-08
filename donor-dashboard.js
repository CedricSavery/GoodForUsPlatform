(function () {
  const STORAGE_KEY = "goodforus_donor_dashboard_data";

  const defaultData = {
    donor: { id: '', name: '', email: '', phone: '', address: '', notes: '' },
    organization: { name: 'GoodForUs', supportEmail: '', receiptFooter: '', taxLanguage: '' },
    preferences: { emailReceipts: true, campaignUpdates: true, recurringReminders: false, smsAlerts: false },
    paymentMethods: [],
    recurringGifts: [],
    donations: [],
    campaigns: []
  };

  const state = loadState();

  const els = {
    pageTitle: document.getElementById("pageTitle"),
    navBtns: document.querySelectorAll(".nav-btn"),
    views: document.querySelectorAll(".view"),
    globalSearch: document.getElementById("globalSearch"),
    statLifetime: document.getElementById("statLifetime"),
    statYear: document.getElementById("statYear"),
    statRecurring: document.getElementById("statRecurring"),
    statReceipts: document.getElementById("statReceipts"),
    welcomeName: document.getElementById("welcomeName"),
    welcomeText: document.getElementById("welcomeText"),
    avatarInitials: document.getElementById("avatarInitials"),
    recentDonationsList: document.getElementById("recentDonationsList"),
    campaignImpactList: document.getElementById("campaignImpactList"),
    donationsTableBody: document.getElementById("donationsTableBody"),
    campaignCards: document.getElementById("campaignCards"),
    recurringList: document.getElementById("recurringList"),
    receiptsList: document.getElementById("receiptsList"),
    paymentMethodsList: document.getElementById("paymentMethodsList"),
    filterMonth: document.getElementById("filterMonth"),
    filterStatus: document.getElementById("filterStatus"),
    profileForm: document.getElementById("profileForm"),
    preferencesForm: document.getElementById("preferencesForm"),
    profileName: document.getElementById("profileName"),
    profileEmail: document.getElementById("profileEmail"),
    profilePhone: document.getElementById("profilePhone"),
    profileAddress: document.getElementById("profileAddress"),
    profileNotes: document.getElementById("profileNotes"),
    prefEmailReceipts: document.getElementById("prefEmailReceipts"),
    prefCampaignUpdates: document.getElementById("prefCampaignUpdates"),
    prefRecurringReminders: document.getElementById("prefRecurringReminders"),
    prefSmsAlerts: document.getElementById("prefSmsAlerts"),
    toast: document.getElementById("toast"),
    exportSummaryBtn: document.getElementById("exportSummaryBtn"),
    downloadLatestReceiptBtn: document.getElementById("downloadLatestReceiptBtn"),

    payTabs: document.querySelectorAll(".pay-tab"),
    payPanes: document.querySelectorAll(".pay-pane"),

    addCardForm: document.getElementById("addCardForm"),
    addBankForm: document.getElementById("addBankForm"),
    addPaypalForm: document.getElementById("addPaypalForm"),

    cardBillingName: document.getElementById("cardBillingName"),
    cardNumber: document.getElementById("cardNumber"),
    cardExp: document.getElementById("cardExp"),
    cardBrand: document.getElementById("cardBrand"),
    cardMakeDefault: document.getElementById("cardMakeDefault"),

    bankAccountName: document.getElementById("bankAccountName"),
    bankName: document.getElementById("bankName"),
    accountType: document.getElementById("accountType"),
    routingNumber: document.getElementById("routingNumber"),
    accountNumber: document.getElementById("accountNumber"),
    bankMakeDefault: document.getElementById("bankMakeDefault"),

    paypalEmail: document.getElementById("paypalEmail"),
    paypalMakeDefault: document.getElementById("paypalMakeDefault")
  };

  init();

  function init() {
    if (window.GFUData) {
      window.GFUData.loadDonorDashboard(state).then(remoteState => {
        Object.assign(state, remoteState);
        saveState(false);
        hydrateProfile();
        renderAll();
      }).catch(() => {});
    }
    hydrateProfile();
    renderAll();
    wireNav();
    wireFilters();
    wireForms();
    wireSearch();
    wireButtons();
    wirePaymentTabs();
    wireFormatting();
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return clone(defaultData);
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        ...clone(defaultData),
        ...parsed
      };
    } catch (e) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return clone(defaultData);
    }
  }

  function saveState(pushRemote = true) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (pushRemote && window.GFUData) window.GFUData.saveDonorDashboard(state).catch(() => {});
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderRecentDonations();
    renderCampaignImpact();
    renderDonationTable();
    renderCampaignCards();
    renderRecurring();
    renderReceipts();
    renderPaymentMethods();
  }

  function renderHeader() {
    const donorName = state.donor?.name || "Donor";
    els.welcomeName.textContent = donorName;
    els.welcomeText.textContent =
      "Thank you for supporting causes that matter. Here is a live view of your impact, giving history, and account preferences.";
    els.avatarInitials.textContent = getInitials(donorName);
  }

  function renderStats() {
    const totalLifetime = sumAmounts(state.donations);
    const currentYear = new Date().getFullYear();
    const totalYear = state.donations
      .filter(d => new Date(d.date).getFullYear() === currentYear)
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const activeRecurring = state.recurringGifts.filter(r => r.status === "Active").length;
    const receiptCount = state.donations.length;

    els.statLifetime.textContent = formatCurrency(totalLifetime);
    els.statYear.textContent = formatCurrency(totalYear);
    els.statRecurring.textContent = String(activeRecurring);
    els.statReceipts.textContent = String(receiptCount);
  }

  function renderRecentDonations() {
    els.recentDonationsList.innerHTML = "";

    const recent = [...state.donations]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);

    if (!recent.length) {
      els.recentDonationsList.innerHTML = emptyState("No donations yet.");
      return;
    }

    recent.forEach(item => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div class="list-item-left">
          <div class="list-title">${escapeHtml(item.campaign)}</div>
          <div class="list-sub">${formatDate(item.date)} • ${escapeHtml(item.method)}</div>
        </div>
        <div class="list-meta">
          <div class="amount">${formatCurrency(item.amount)}</div>
          <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
      `;
      els.recentDonationsList.appendChild(row);
    });
  }

  function renderCampaignImpact() {
    els.campaignImpactList.innerHTML = "";
    const campaignTotals = getCampaignTotals();

    if (!campaignTotals.length) {
      els.campaignImpactList.innerHTML = emptyState("No supported campaigns yet.");
      return;
    }

    campaignTotals.forEach(item => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div class="list-item-left">
          <div class="list-title">${escapeHtml(item.name)}</div>
          <div class="list-sub">${item.count} donation${item.count === 1 ? "" : "s"} made</div>
        </div>
        <div class="list-meta">
          <div class="amount">${formatCurrency(item.total)}</div>
        </div>
      `;
      els.campaignImpactList.appendChild(row);
    });
  }

  function renderDonationTable() {
    els.donationsTableBody.innerHTML = "";
    const rows = getFilteredDonations();

    if (!rows.length) {
      els.donationsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">No donations match your filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.campaign)}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td>${escapeHtml(item.method)}</td>
        <td><span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>
          <button class="receipt-btn" data-receipt-id="${item.id}">
            <i class="fa-solid fa-file-arrow-down"></i>
            Receipt PDF
          </button>
        </td>
      `;
      els.donationsTableBody.appendChild(tr);
    });

    els.donationsTableBody.querySelectorAll("[data-receipt-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const donation = state.donations.find(d => d.id === btn.dataset.receiptId);
        if (donation) downloadReceiptPdf(donation);
      });
    });
  }

  function renderCampaignCards() {
    els.campaignCards.innerHTML = "";
    const totals = getCampaignTotals();

    if (!totals.length) {
      els.campaignCards.innerHTML = emptyState("No campaign activity yet.");
      return;
    }

    totals.forEach(item => {
      const pct = item.goal > 0 ? Math.min((item.total / item.goal) * 100, 100) : 0;
      const card = document.createElement("div");
      card.className = "campaign-card";
      card.innerHTML = `
        <div class="campaign-top">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description || "Campaign support and donor impact summary.")}</p>
          </div>
          <span class="badge completed">Supported</span>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <div class="progress-foot">
          <span>Your Giving: ${formatCurrency(item.total)}</span>
          <span>Goal: ${formatCurrency(item.goal || 0)}</span>
        </div>
      `;
      els.campaignCards.appendChild(card);
    });
  }

  function renderRecurring() {
    els.recurringList.innerHTML = "";

    if (!state.recurringGifts.length) {
      els.recurringList.innerHTML = emptyState("No recurring gifts set up.");
      return;
    }

    state.recurringGifts.forEach(item => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div class="list-item-left">
          <div class="list-title">${escapeHtml(item.campaign)}</div>
          <div class="list-sub">
            ${escapeHtml(item.frequency)} • Next charge ${formatDate(item.nextCharge)}
          </div>
        </div>
        <div class="list-meta">
          <div class="amount">${formatCurrency(item.amount)}</div>
          <span class="badge ${item.status === "Active" ? "completed" : "pending"}">${escapeHtml(item.status)}</span>
          <button class="btn-danger" data-pause-id="${item.id}">
            <i class="fa-solid fa-pause"></i>
            ${item.status === "Active" ? "Pause" : "Resume"}
          </button>
        </div>
      `;
      els.recurringList.appendChild(row);
    });

    els.recurringList.querySelectorAll("[data-pause-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const recurring = state.recurringGifts.find(r => r.id === btn.dataset.pauseId);
        if (!recurring) return;
        recurring.status = recurring.status === "Active" ? "Paused" : "Active";
        saveState();
        renderAll();
        showToast(`Recurring gift ${recurring.status.toLowerCase()}.`);
      });
    });
  }

  function renderReceipts() {
    els.receiptsList.innerHTML = "";

    if (!state.donations.length) {
      els.receiptsList.innerHTML = emptyState("No receipts available yet.");
      return;
    }

    [...state.donations]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(item => {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
          <div class="list-item-left">
            <div class="list-title">${escapeHtml(item.receiptNumber)}</div>
            <div class="list-sub">${escapeHtml(item.campaign)} • ${formatDate(item.date)}</div>
          </div>
          <div class="list-meta">
            <div class="amount">${formatCurrency(item.amount)}</div>
            <button class="receipt-btn" data-receipt-download="${item.id}">
              <i class="fa-solid fa-download"></i>
              Download PDF
            </button>
          </div>
        `;
        els.receiptsList.appendChild(row);
      });

    els.receiptsList.querySelectorAll("[data-receipt-download]").forEach(btn => {
      btn.addEventListener("click", () => {
        const donation = state.donations.find(d => d.id === btn.dataset.receiptDownload);
        if (donation) downloadReceiptPdf(donation);
      });
    });
  }

  function renderPaymentMethods() {
    els.paymentMethodsList.innerHTML = "";

    if (!state.paymentMethods.length) {
      els.paymentMethodsList.innerHTML = emptyState("No saved payment methods.");
      return;
    }

    state.paymentMethods.forEach(item => {
      const row = document.createElement("div");
      row.className = "list-item";

      const summary = getPaymentSummary(item);
      const icon = getPaymentIcon(item.type);

      row.innerHTML = `
        <div class="list-item-left">
          <div class="method-head">
            <div class="method-icon">
              <i class="${icon}"></i>
            </div>
            <div>
              <div class="list-title">${escapeHtml(summary.title)}</div>
              <div class="list-sub">${escapeHtml(summary.sub)}</div>
            </div>
          </div>
        </div>
        <div class="list-meta">
          ${item.isDefault ? '<span class="badge completed">Default</span>' : '<span class="badge neutral">Saved</span>'}
          ${!item.isDefault ? `
            <button class="btn-secondary" data-default-id="${item.id}">
              <i class="fa-solid fa-check"></i>
              Make Default
            </button>
          ` : ""}
          ${!item.isDefault ? `
            <button class="btn-danger" data-remove-id="${item.id}">
              <i class="fa-solid fa-trash"></i>
              Remove
            </button>
          ` : ""}
        </div>
      `;
      els.paymentMethodsList.appendChild(row);
    });

    els.paymentMethodsList.querySelectorAll("[data-default-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.defaultId;
        state.paymentMethods.forEach(pm => {
          pm.isDefault = pm.id === id;
        });
        saveState();
        renderPaymentMethods();
        showToast("Default payment method updated.");
      });
    });

    els.paymentMethodsList.querySelectorAll("[data-remove-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeId;
        state.paymentMethods = state.paymentMethods.filter(pm => pm.id !== id);
        saveState();
        renderPaymentMethods();
        showToast("Payment method removed.");
      });
    });
  }

  function hydrateProfile() {
    els.profileName.value = state.donor.name || "";
    els.profileEmail.value = state.donor.email || "";
    els.profilePhone.value = state.donor.phone || "";
    els.profileAddress.value = state.donor.address || "";
    els.profileNotes.value = state.donor.notes || "";

    els.prefEmailReceipts.checked = !!state.preferences.emailReceipts;
    els.prefCampaignUpdates.checked = !!state.preferences.campaignUpdates;
    els.prefRecurringReminders.checked = !!state.preferences.recurringReminders;
    els.prefSmsAlerts.checked = !!state.preferences.smsAlerts;
  }

  function wireNav() {
    els.navBtns.forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    document.querySelectorAll("[data-jump]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.jump));
    });
  }

  function setView(viewName) {
    els.navBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    els.views.forEach(view => {
      view.classList.toggle("active", view.id === `view-${viewName}`);
    });

    els.pageTitle.textContent = titleCase(viewName.replace("-", " "));
  }

  function wireFilters() {
    els.filterMonth.addEventListener("input", renderDonationTable);
    els.filterStatus.addEventListener("change", renderDonationTable);
  }

  function wireForms() {
    els.profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      state.donor.name = els.profileName.value.trim();
      state.donor.email = els.profileEmail.value.trim();
      state.donor.phone = els.profilePhone.value.trim();
      state.donor.address = els.profileAddress.value.trim();
      state.donor.notes = els.profileNotes.value.trim();
      saveState();
      renderHeader();
      showToast("Profile updated.");
    });

    els.preferencesForm.addEventListener("submit", function (e) {
      e.preventDefault();
      state.preferences.emailReceipts = els.prefEmailReceipts.checked;
      state.preferences.campaignUpdates = els.prefCampaignUpdates.checked;
      state.preferences.recurringReminders = els.prefRecurringReminders.checked;
      state.preferences.smsAlerts = els.prefSmsAlerts.checked;
      saveState();
      showToast("Preferences saved.");
    });

    if (els.addCardForm) {
      els.addCardForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const billingName = els.cardBillingName.value.trim();
        const cardNumberRaw = onlyDigits(els.cardNumber.value);
        const exp = els.cardExp.value.trim();
        const brand = els.cardBrand.value;
        const makeDefault = els.cardMakeDefault.checked;

        if (!billingName || cardNumberRaw.length < 12 || !exp) {
          showToast("Please complete the card form.");
          return;
        }

        const newMethod = {
          id: createId("pm"),
          type: "card",
          brand,
          last4: cardNumberRaw.slice(-4),
          exp,
          billingName,
          isDefault: !!makeDefault
        };

        if (makeDefault || state.paymentMethods.length === 0) {
          clearDefaultPaymentMethod();
          newMethod.isDefault = true;
        }

        state.paymentMethods.push(newMethod);
        saveState();
        renderPaymentMethods();
        els.addCardForm.reset();
        showToast("Card added.");
      });
    }

    if (els.addBankForm) {
      els.addBankForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const billingName = els.bankAccountName.value.trim();
        const bankName = els.bankName.value.trim();
        const accountType = els.accountType.value;
        const routingNumber = onlyDigits(els.routingNumber.value);
        const accountNumber = onlyDigits(els.accountNumber.value);
        const makeDefault = els.bankMakeDefault.checked;

        if (!billingName || !bankName || routingNumber.length !== 9 || accountNumber.length < 4) {
          showToast("Please enter valid bank account details.");
          return;
        }

        const newMethod = {
          id: createId("pm"),
          type: "bank",
          bankName,
          accountType,
          last4: accountNumber.slice(-4),
          routingLast4: routingNumber.slice(-4),
          billingName,
          isDefault: !!makeDefault
        };

        if (makeDefault || state.paymentMethods.length === 0) {
          clearDefaultPaymentMethod();
          newMethod.isDefault = true;
        }

        state.paymentMethods.push(newMethod);
        saveState();
        renderPaymentMethods();
        els.addBankForm.reset();
        showToast("Bank account linked.");
      });
    }

    if (els.addPaypalForm) {
      els.addPaypalForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const paypalEmail = els.paypalEmail.value.trim();
        const makeDefault = els.paypalMakeDefault.checked;

        if (!paypalEmail || !paypalEmail.includes("@")) {
          showToast("Please enter a valid PayPal email.");
          return;
        }

        const exists = state.paymentMethods.some(pm =>
          pm.type === "paypal" &&
          String(pm.paypalEmail || "").toLowerCase() === paypalEmail.toLowerCase()
        );

        if (exists) {
          showToast("That PayPal account is already connected.");
          return;
        }

        const newMethod = {
          id: createId("pm"),
          type: "paypal",
          paypalEmail,
          isDefault: !!makeDefault
        };

        if (makeDefault || state.paymentMethods.length === 0) {
          clearDefaultPaymentMethod();
          newMethod.isDefault = true;
        }

        state.paymentMethods.push(newMethod);
        saveState();
        renderPaymentMethods();
        els.addPaypalForm.reset();
        showToast("PayPal connected.");
      });
    }
  }

  function wireSearch() {
    els.globalSearch.addEventListener("input", function () {
      renderDonationTable();
    });
  }

  function wireButtons() {
    els.exportSummaryBtn.addEventListener("click", exportSummaryJson);
    els.downloadLatestReceiptBtn.addEventListener("click", function () {
      const latest = [...state.donations].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!latest) {
        showToast("No receipt available.");
        return;
      }
      downloadReceiptPdf(latest);
    });
  }

  function wirePaymentTabs() {
    if (!els.payTabs.length) return;

    els.payTabs.forEach(tab => {
      tab.addEventListener("click", function () {
        const target = tab.dataset.payTab;

        els.payTabs.forEach(t => t.classList.toggle("active", t === tab));
        els.payPanes.forEach(pane => {
          pane.classList.toggle("active", pane.id === `pay-pane-${target}`);
        });
      });
    });
  }

  function wireFormatting() {
    if (els.cardNumber) {
      els.cardNumber.addEventListener("input", function () {
        const digits = onlyDigits(this.value).slice(0, 16);
        this.value = digits.replace(/(.{4})/g, "$1 ").trim();
      });
    }

    if (els.cardExp) {
      els.cardExp.addEventListener("input", function () {
        let digits = onlyDigits(this.value).slice(0, 4);
        if (digits.length >= 3) {
          digits = digits.slice(0, 2) + "/" + digits.slice(2);
        }
        this.value = digits;
      });
    }

    if (els.routingNumber) {
      els.routingNumber.addEventListener("input", function () {
        this.value = onlyDigits(this.value).slice(0, 9);
      });
    }

    if (els.accountNumber) {
      els.accountNumber.addEventListener("input", function () {
        this.value = onlyDigits(this.value).slice(0, 17);
      });
    }
  }

  function getFilteredDonations() {
    const monthVal = els.filterMonth.value;
    const statusVal = els.filterStatus.value;
    const searchVal = (els.globalSearch.value || "").trim().toLowerCase();

    return [...state.donations]
      .filter(item => {
        if (monthVal) {
          const itemMonth = item.date.slice(0, 7);
          if (itemMonth !== monthVal) return false;
        }

        if (statusVal !== "all" && item.status !== statusVal) {
          return false;
        }

        if (searchVal) {
          const haystack = `${item.campaign} ${item.method} ${item.receiptNumber}`.toLowerCase();
          if (!haystack.includes(searchVal)) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getCampaignTotals() {
    return state.campaigns
      .map(campaign => {
        const matching = state.donations.filter(d => d.campaignSlug === campaign.slug);
        return {
          name: campaign.name,
          description: campaign.description,
          goal: Number(campaign.goal || 0),
          total: matching.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          count: matching.length
        };
      })
      .filter(item => item.count > 0)
      .sort((a, b) => b.total - a.total);
  }

  function exportSummaryJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "goodforus-donor-summary.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Summary exported.");
  }

  function downloadReceiptPdf(donation) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast("PDF library not loaded.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const orgName = state.organization?.name || "GoodForUs";
    const donorName = state.donor?.name || "Donor";
    const donorEmail = state.donor?.email || "";
    const campaign = donation.campaign || "Campaign";
    const campaignRecord = state.campaigns.find(c => c.slug === donation.campaignSlug || c.name === donation.campaign);
    const campaignDescription = donation.campaignDescription || campaignRecord?.description || "Campaign contribution";
    const campaignGoal = campaignRecord?.goal ? formatCurrency(campaignRecord.goal) : "N/A";
    const amount = formatCurrency(donation.amount);
    const date = formatDate(donation.date);
    const paymentMethod = donation.method || "Payment Method";
    const frequency = donation.frequency || "One-time";
    const taxLanguage = state.organization?.taxLanguage || "No goods or services were provided in exchange for this contribution.";
    const receiptFooter = state.organization?.receiptFooter || "Thank you for supporting this organization.";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(orgName, 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Supporting meaningful causes together", 20, 31);

    doc.setDrawColor(220, 226, 234);
    doc.line(20, 36, 190, 36);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`DONOR: ${String(donorName).toUpperCase()}`, 20, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`EMAIL: ${donorEmail}`, 20, 55);
    doc.text(`PAYMENT METHOD: ${paymentMethod}`, 20, 62);

    doc.autoTable({
      startY: 74,
      head: [["Campaign", "Frequency", "Amount"]],
      body: [[campaign, frequency, amount]],
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      margin: { left: 20, right: 20 }
    });

    const finalY = doc.lastAutoTable.finalY || 105;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CAMPAIGN INFORMATION", 20, finalY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const campaignInfoLines = [
      `Campaign Name: ${campaign}`,
      `Campaign Goal: ${campaignGoal}`,
      `Donation Type: ${frequency}`,
      `Campaign Description: ${campaignDescription}`
    ];
    doc.text(doc.splitTextToSize(campaignInfoLines.join(" | "), 170), 20, finalY + 24);

    const campaignInfoY = finalY + 46;

    doc.setFont("helvetica", "bold");
    doc.text(`RECEIPT ID: ${donation.receiptNumber}`, 20, campaignInfoY);
    doc.text(`DATE: ${date}`, 20, campaignInfoY + 8);
    doc.text(`STATUS: ${donation.status || "Completed"}`, 20, campaignInfoY + 16);
    doc.text(`DONATION ID: ${donation.id}`, 20, campaignInfoY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(taxLanguage, 170), 20, campaignInfoY + 38);
    doc.text(doc.splitTextToSize(receiptFooter, 170), 20, campaignInfoY + 52);

    doc.save(`Receipt_${donation.receiptNumber}.pdf`);
    showToast(`Receipt ${donation.receiptNumber} downloaded.`);
  }

  function clearDefaultPaymentMethod() {
    state.paymentMethods.forEach(pm => {
      pm.isDefault = false;
    });
  }

  function getPaymentSummary(method) {
    if (method.type === "card") {
      return {
        title: `${method.brand} •••• ${method.last4}`,
        sub: `Expires ${method.exp} • ${method.billingName}`
      };
    }

    if (method.type === "bank") {
      return {
        title: `${method.bankName} • ${method.accountType} •••• ${method.last4}`,
        sub: `ACH linked • Routing ending ${method.routingLast4} • ${method.billingName}`
      };
    }

    if (method.type === "paypal") {
      return {
        title: `PayPal`,
        sub: method.paypalEmail
      };
    }

    return {
      title: "Saved Payment Method",
      sub: "Available for donations"
    };
  }

  function getPaymentIcon(type) {
    if (type === "card") return "fa-regular fa-credit-card";
    if (type === "bank") return "fa-solid fa-building-columns";
    if (type === "paypal") return "fa-brands fa-paypal";
    return "fa-solid fa-wallet";
  }

  function getInitials(name) {
    return (name || "Donor")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");
  }

  function sumAmounts(items) {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(amount || 0));
  }

  function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function titleCase(text) {
    return text.replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function statusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "completed") return "completed";
    if (normalized === "pending") return "pending";
    if (normalized === "refunded") return "refunded";
    return "pending";
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  let toastTimer = null;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2200);
  }
})();