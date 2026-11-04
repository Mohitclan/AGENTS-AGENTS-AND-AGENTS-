// Quick approval viewer enhancement for Mission Control
// Adds sidebar draft viewer with approve/reject buttons

const ApprovalViewer = {
  current: null,

  init() {
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      .approval-sidebar {
        position: fixed;
        right: 0;
        top: 0;
        width: 500px;
        height: 100vh;
        background: white;
        border-left: 2px solid #0066cc;
        display: none;
        flex-direction: column;
        z-index: 1000;
        box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      }
      .approval-sidebar.open {
        display: flex;
      }
      .approval-header {
        padding: 20px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .approval-header h3 {
        margin: 0;
        color: #0066cc;
      }
      .approval-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      .approval-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .approval-footer {
        padding: 20px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 10px;
        background: #f9f9f9;
      }
      .approval-footer button {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      .btn-edit {
        background: #f0f4f8;
        color: #0066cc;
        border: 1px solid #0066cc;
      }
      .btn-edit:hover {
        background: #e0ecff;
      }
      .btn-approve {
        background: #28a745;
        color: white;
      }
      .btn-approve:hover {
        background: #218838;
      }
      .btn-approve:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .btn-reject {
        background: #dc3545;
        color: white;
      }
      .btn-reject:hover {
        background: #c82333;
      }
      .btn-reject:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .error-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #dc3545;
        border-radius: 8px;
        padding: 30px;
        min-width: 400px;
        z-index: 2000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: none;
      }
      .error-modal.show {
        display: block;
      }
      .error-modal h3 {
        color: #dc3545;
        margin-top: 0;
      }
      .error-details {
        background: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 15px;
        margin: 15px 0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        display: none;
        max-height: 200px;
        overflow-y: auto;
      }
      .error-details.show {
        display: block;
      }
      .error-modal button {
        margin-right: 10px;
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        background: white;
      }
      .error-modal button:hover {
        background: #f0f0f0;
      }

      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.3);
        display: none;
        z-index: 999;
      }
      .overlay.show {
        display: block;
      }
    `;
    document.head.appendChild(style);

    // Create HTML elements
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'approval-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.createElement('div');
    sidebar.className = 'approval-sidebar';
    sidebar.innerHTML = `
      <div class="approval-header">
        <h3>Draft Review</h3>
        <button class="approval-close" onclick="ApprovalViewer.close()">×</button>
      </div>
      <div class="approval-content" id="approval-text"></div>
      <div class="approval-footer">
        <button class="btn-edit" onclick="ApprovalViewer.edit()">Edit</button>
        <button class="btn-approve" id="btn-approve" onclick="ApprovalViewer.approve()">Approve & Send</button>
        <button class="btn-reject" id="btn-reject" onclick="ApprovalViewer.reject()">Reject</button>
      </div>
    `;
    document.body.appendChild(sidebar);

    const errorModal = document.createElement('div');
    errorModal.className = 'error-modal';
    errorModal.id = 'error-modal';
    errorModal.innerHTML = `
      <h3>⚠️ Send Failed</h3>
      <p id="error-message">Email could not be sent.</p>
      <button onclick="ApprovalViewer.showErrorDetails()">Show Error Details</button>
      <button onclick="ApprovalViewer.closeError()">Close</button>
      <div class="error-details" id="error-details"></div>
    `;
    document.body.appendChild(errorModal);

    // Listen for clicks on approval items
    document.addEventListener('click', (e) => {
      const item = e.target.closest('[data-approval-id]');
      if (item) {
        ApprovalViewer.view(item.dataset.approvalId);
      }
    });
  },

  async view(id) {
    this.current = id;
    try {
      const response = await fetch(`/api/approval/${id}/view`);
      if (!response.ok) throw new Error('Could not load draft');
      const data = await response.json();

      document.getElementById('approval-text').textContent = data.content;
      document.querySelector('.approval-sidebar').classList.add('open');
      document.getElementById('approval-overlay').classList.add('show');
    } catch (error) {
      this.showError('Could not load draft', error.message);
    }
  },

  close() {
    document.querySelector('.approval-sidebar').classList.remove('open');
    document.getElementById('approval-overlay').classList.remove('show');
    this.current = null;
  },

  edit() {
    if (this.current) {
      // Open in editor - would navigate to edit page
      console.log('Edit:', this.current);
      alert('Edit feature coming soon - use CLI for now');
    }
  },

  async approve() {
    if (!this.current) return;
    const btn = document.getElementById('btn-approve');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const response = await fetch(`/api/approval/${this.current}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (!response.ok) {
        throw { message: data.message, details: data.details };
      }

      // Success
      this.close();
      alert('✅ Email sent successfully!');
      location.reload(); // Refresh to update list
    } catch (error) {
      this.showError(error.message, error.details);
      btn.disabled = false;
      btn.textContent = 'Approve & Send';
    }
  },

  async reject() {
    if (!this.current) return;
    if (!confirm('Remove this from approvals?')) return;

    const btn = document.getElementById('btn-reject');
    btn.disabled = true;

    try {
      const response = await fetch(`/api/approval/${this.current}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      // Success
      this.close();
      alert('Approval removed');
      location.reload();
    } catch (error) {
      this.showError('Could not reject', error.message);
      btn.disabled = false;
    }
  },

  showError(message, details) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-details').textContent = details || 'No details available';
    modal.classList.add('show');
  },

  showErrorDetails() {
    const details = document.getElementById('error-details');
    details.classList.add('show');
  },

  closeError() {
    document.getElementById('error-modal').classList.remove('show');
    document.getElementById('error-details').classList.remove('show');
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ApprovalViewer.init());
} else {
  ApprovalViewer.init();
}
