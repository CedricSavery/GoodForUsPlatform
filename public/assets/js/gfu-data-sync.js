(function () {
  const API = {
    async get(path) {
      const res = await fetch(path, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(path + ' failed');
      return res.json();
    },
    async post(path, data) {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data || {})
      });
      if (!res.ok) throw new Error(path + ' failed');
      return res.json();
    }
  };

  function hasServer() {
    return location.protocol !== 'file:';
  }
  function blankOrgdash() {
    return { settings: {}, campaigns: [], donors: [], users: [], banks: [], payouts: [], riskCases: [], ledger: [], audit: [] };
  }
  function blankDonor() {
    return { donor: {}, organization: {}, preferences: {}, paymentMethods: [], recurringGifts: [], donations: [], campaigns: [] };
  }
  function mergeIfServerData(local, remote, blank) {
    if (!remote || typeof remote !== 'object') return local || blank();
    const hasRemoteArrays = Object.values(remote).some(v => Array.isArray(v) && v.length);
    const hasRemoteObjects = Object.values(remote).some(v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length);
    return (hasRemoteArrays || hasRemoteObjects) ? { ...blank(), ...(local || {}), ...remote } : { ...blank(), ...(local || {}) };
  }

  window.GFUData = {
    async bootstrap() {
      if (!hasServer()) return null;
      return API.get('/api/bootstrap');
    },
    async loadApplications() {
      if (!hasServer()) return null;
      return API.get('/api/applications');
    },
    async saveApplication(application) {
      if (!hasServer()) return null;
      return API.post('/api/applications', application);
    },
    async loadOrgdash(localState) {
      if (!hasServer()) return localState || blankOrgdash();
      const remote = await API.get('/api/orgdash-state');
      return mergeIfServerData(localState, remote, blankOrgdash);
    },
    async saveOrgdash(state) {
      if (!hasServer()) return null;
      return API.post('/api/orgdash-state', state);
    },
    async loadDonorDashboard(localState) {
      if (!hasServer()) return localState || blankDonor();
      const remote = await API.get('/api/donor-dashboard');
      return mergeIfServerData(localState, remote, blankDonor);
    },
    async saveDonorDashboard(state) {
      if (!hasServer()) return null;
      return API.post('/api/donor-dashboard', state);
    },
    async saveCampaign(campaign) {
      if (!hasServer()) return null;
      return API.post('/api/campaigns/upsert-from-builder', campaign);
    }
  };
})();
