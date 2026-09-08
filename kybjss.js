const verifyBtn = document.getElementById('verifyBusinessBtn');
const modal = document.getElementById('diditModal');
const iframe = document.getElementById('diditFrame');
const closeModal = document.getElementById('closeModal');
const statusDiv = document.getElementById('status');

let verificationStarted = false;
const DIDIT_KYB_URL = 'https://verify.didit.me/u/JTgzmopARrSN2gwcvACjvQ';

if (verifyBtn && modal && iframe && statusDiv) {
  verifyBtn.onclick = () => {
    iframe.src = DIDIT_KYB_URL;
    modal.style.display = 'block';
    verificationStarted = true;
    statusDiv.innerText = 'Status: In Progress';
  };
}

if (closeModal && modal && statusDiv) {
  closeModal.onclick = () => {
    modal.style.display = 'none';
    if (verificationStarted) statusDiv.innerText = 'Status: Pending Completion';
  };
}

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://verify.didit.me') return;
  const data = event.data;
  const completed = data && (
    data.type === 'verification_complete' ||
    data.status === 'approved' ||
    data.status === 'verified' ||
    data.status === 'completed'
  );
  if (completed && modal && statusDiv) {
    modal.style.display = 'none';
    statusDiv.innerText = 'Status: Verified';
    verificationStarted = false;
  }
});
