/**
 * AVIORA EDUCATION - OFFICIAL PAYPAL PAYMENT, INVOICING & VERIFICATION SYSTEM
 */
const AvioraPayments = {
  studentInvoices: [],
  studentPayments: [],
  paymentSettings: null,
  activeInvoiceId: null,
  selectedChannel: 'paypal_qr',
  pendingProofFile: null,
  pendingProofPreviewUrl: null,
  adminPayments: [],
  adminCounts: { all: 0, pending: 0, accepted: 0, not_received: 0 },
  adminFilter: 'all',
  adminSearch: '',
  pendingAdminQrFile: null,

  escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  formatMoney(amount, currencyCode = 'USD', symbol = '$') {
    const num = Number(amount) || 0;
    const sym = symbol || '$';
    const zeroDec = ['JPY', 'KRW', 'VND', 'IDR'].includes(String(currencyCode || '').toUpperCase());
    const formatted = zeroDec
      ? Math.round(num).toLocaleString('en-US')
      : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sym}${formatted}`;
  },

  formatDateTime(val) {
    if (!val) return '—';
    const raw = String(val).trim();
    const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw) ? new Date(raw.replace(' ', 'T') + 'Z') : new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  statusMeta(status) {
    const s = String(status || 'unpaid').toLowerCase();
    if (s === 'accepted') return { label: 'Accepted', cls: 'paypal-status-accepted' };
    if (s === 'pending' || s === 'pending_verification') return { label: 'Pending Verification', cls: 'paypal-status-pending' };
    if (s === 'not_received') return { label: 'Not Received', cls: 'paypal-status-rejected' };
    return { label: 'Awaiting Payment', cls: 'paypal-status-unpaid' };
  },

  async createInvoiceAndGoToPayments(invoicePayload) {
    const res = await API.createStudentInvoice(invoicePayload);
    if (!res || !res.invoice) {
      throw new Error('Could not generate payment invoice.');
    }
    showToast(res.message || `Invoice ${res.invoice.invoice_number} ready for PayPal payment.`, 'success');
    const targetHash = `#student-payments?invoice=${encodeURIComponent(res.invoice.invoice_number)}`;
    this.activeInvoiceId = res.invoice.id;
    window.location.hash = targetHash;
    if (typeof Router !== 'undefined' && Router.handleRoute) {
      await Router.handleRoute();
    }
    return res.invoice;
  },

  async loadStudentPaymentsPage(queryParams = null) {
    const user = Auth.currentUser;
    if (!user || user.role !== 'student') {
      showToast('Please sign in with your student account to access PayPal payments & invoices.', 'info');
      window.location.hash = '#login';
      return;
    }

    try {
      const data = await API.getStudentPayments();
      this.studentInvoices = data.invoices || [];
      this.studentPayments = data.payments || [];
      this.paymentSettings = data.settings || {};

      const invParam = queryParams && typeof queryParams.get === 'function' ? queryParams.get('invoice') : null;
      if (invParam) {
        const matched = this.studentInvoices.find(i => i.invoice_number === invParam || String(i.id) === String(invParam));
        if (matched) this.activeInvoiceId = matched.id;
      }
      if (!this.activeInvoiceId || !this.studentInvoices.some(i => i.id === this.activeInvoiceId)) {
        const actionable = this.studentInvoices.find(i => ['unpaid', 'not_received'].includes(i.status));
        this.activeInvoiceId = actionable ? actionable.id : (this.studentInvoices[0]?.id || null);
      }

      this.renderStudentCheckout();
      this.renderStudentHistory();
    } catch (err) {
      console.error('Error loading student payments page:', err);
      showToast(err.message || 'Failed to load student PayPal payments.', 'error');
    }
  },

  selectInvoiceForPayment(invoiceId) {
    this.activeInvoiceId = Number(invoiceId);
    this.clearProofSelection();
    this.renderStudentCheckout();
    const box = document.getElementById('student-paypal-checkout-box');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  selectChannel(channel) {
    this.selectedChannel = channel;
    this.renderStudentCheckout();
  },

  renderStudentCheckout() {
    const box = document.getElementById('student-paypal-checkout-box');
    if (!box) return;

    const inv = this.studentInvoices.find(i => i.id === this.activeInvoiceId) || null;
    const s = this.paymentSettings || {};
    const holderName = s.paypal_holder_name || 'Stephanie Nicole Debo Manalo';
    const holderContact = s.paypal_contact || '09945586658';

    if (!inv) {
      box.innerHTML = `
        <div class="dash-section-box" style="text-align: center; padding: 2.5rem 1.5rem;">
          <h3 style="margin-bottom: 0.45rem;">No Active Unpaid Invoice Selected</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 520px; margin: 0 auto 1.25rem;">
            Book a 1-on-1 lesson, subscription package, or Aviora Buddy session using <strong>PayPal</strong> to automatically generate an exact invoice for verification.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <a href="#tutors" class="btn btn-primary btn-sm">Browse Tutors →</a>
            <a href="#subscriptions" class="btn btn-outline-gold btn-sm">View Lesson Packages</a>
          </div>
        </div>
      `;
      return;
    }

    const stMeta = this.statusMeta(inv.status);
    const exactAmountStr = this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol);
    const hasPendingPayment = Array.isArray(inv.payments) && inv.payments.some(p => p.status === 'pending');
    const isAccepted = inv.status === 'accepted';
    const canSubmitProof = !hasPendingPayment && !isAccepted && ['unpaid', 'not_received'].includes(inv.status);
    const latestRejection = Array.isArray(inv.payments) ? inv.payments.find(p => p.status === 'not_received') : null;
    const todayIso = new Date().toISOString().slice(0, 10);

    box.innerHTML = `
      <div class="paypal-checkout-shell">
        <!-- Left Column: Invoice Lock & Official Recipient + QR / Checkout -->
        <div class="paypal-panel-card">
          <div class="paypal-panel-header">
            <div>
              <div class="paypal-eyebrow">Official Aviora PayPal Invoice</div>
              <h2 class="paypal-inv-num">${this.escapeHtml(inv.invoice_number)}</h2>
              <div class="paypal-inv-title">${this.escapeHtml(inv.title)}</div>
              <div class="paypal-inv-sub">${this.escapeHtml(inv.description || '')} • Issued ${this.formatDateTime(inv.created_at)}</div>
            </div>
            <div style="text-align: right;">
              <span class="paypal-status-badge ${stMeta.cls}">${stMeta.label}</span>
              <div class="paypal-amount-label" style="margin-top: 0.65rem;">Exact Amount Due</div>
              <div class="paypal-exact-amount" id="paypal-locked-invoice-amount">${this.escapeHtml(exactAmountStr)}</div>
              <div class="paypal-amount-lock-note">Locked to invoice • Not editable</div>
            </div>
          </div>

          ${inv.discount_amount > 0 ? `
            <div class="paypal-voucher-strip">
              Voucher <strong>${this.escapeHtml(inv.voucher_code)}</strong> applied (${inv.discount_percent}% off • Saved ${this.escapeHtml(this.formatMoney(inv.discount_amount, inv.currency_code, inv.currency_symbol))})
            </div>
          ` : ''}

          <!-- Admin Designated PayPal Recipient Card -->
          <div class="paypal-recipient-card">
            <div class="paypal-recipient-badge">Designated Official PayPal Recipient</div>
            <div class="paypal-recipient-grid">
              <div>
                <div class="paypal-field-label">Account Holder Name</div>
                <div class="paypal-field-value">${this.escapeHtml(holderName)}</div>
              </div>
              <div>
                <div class="paypal-field-label">Registered PayPal Account / Contact</div>
                <div class="paypal-field-value" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span>${this.escapeHtml(holderContact)}</span>
                  <button type="button" class="btn btn-outline-gold btn-sm" style="padding: 0.18rem 0.55rem; font-size: 0.72rem;" onclick="AvioraPayments.copyText('${this.escapeHtml(holderContact)}', 'PayPal contact copied')">Copy</button>
                </div>
              </div>
            </div>
            <p class="paypal-recipient-note">
              Verify the exact recipient name (<strong>${this.escapeHtml(holderName)}</strong>) and PayPal contact (<strong>${this.escapeHtml(holderContact)}</strong>) in PayPal before confirming your transfer.
            </p>
          </div>

          <!-- Payment Channel Selector -->
          <div class="paypal-channel-tabs">
            <button type="button" class="paypal-channel-tab ${this.selectedChannel === 'paypal_qr' ? 'active' : ''}" onclick="AvioraPayments.selectChannel('paypal_qr')">
              PayPal QR Code Payment (Scan to Pay)
            </button>
            <button type="button" class="paypal-channel-tab ${this.selectedChannel === 'paypal_checkout' ? 'active' : ''}" onclick="AvioraPayments.selectChannel('paypal_checkout')">
              Direct PayPal Checkout
            </button>
          </div>

          ${this.selectedChannel === 'paypal_qr' ? `
            <div class="paypal-qr-section">
              <div class="paypal-qr-preview-col">
                ${s.has_qr_image && s.qr_image_data ? `
                  <div class="paypal-qr-frame">
                    <img id="student-official-paypal-qr" src="${s.qr_image_data}" alt="Official Admin PayPal QR Code" class="paypal-qr-img" onclick="AvioraPayments.openImageModal(AvioraPayments.paymentSettings.qr_image_data, 'Official Admin PayPal QR Code — Stephanie Nicole Debo Manalo (09945586658)')" />
                  </div>
                  <button type="button" class="btn btn-outline-gold btn-sm" style="width: 100%; justify-content: center; margin-top: 0.55rem;" onclick="AvioraPayments.openImageModal(AvioraPayments.paymentSettings.qr_image_data, 'Official Admin PayPal QR Code — Stephanie Nicole Debo Manalo (09945586658)')">
                    Enlarge / View Full QR Code
                  </button>
                ` : `
                  <div class="paypal-qr-missing-box">
                    <strong>Official Admin PayPal QR Code Pending Upload</strong>
                    <p>The Administrator has not uploaded the official PayPal QR image yet. Please contact support or transfer directly to <strong>${this.escapeHtml(holderName)}</strong> (${this.escapeHtml(holderContact)}) in PayPal.</p>
                  </div>
                `}
              </div>
              <div class="paypal-qr-instructions-col">
                <h4 style="margin: 0 0 0.45rem 0;">Scan to Pay via PayPal App</h4>
                <ol class="paypal-steps-list">
                  <li>Open your <strong>PayPal</strong> mobile app and tap <strong>Scan / Pay</strong>.</li>
                  <li>Scan the Admin PayPal QR code displayed on the left and confirm recipient: <strong>${this.escapeHtml(holderName)}</strong> (<code>${this.escapeHtml(holderContact)}</code>).</li>
                  <li>Enter the exact invoice amount shown above: <strong>${this.escapeHtml(exactAmountStr)}</strong>.</li>
                  <li>Complete your payment and save a clear <strong>JPG or PNG screenshot</strong> of the PayPal confirmation screen.</li>
                </ol>
                <div class="paypal-qr-limitation-alert">
                  <strong>Static QR Verification Notice:</strong> Because this official PayPal QR code does not automatically embed your invoice total inside the QR payload, the system requires you to transfer exactly <strong>${this.escapeHtml(exactAmountStr)}</strong> and upload your payment confirmation screenshot for Administrator verification before your booking becomes Accepted.
                </div>
              </div>
            </div>
          ` : `
            <div class="paypal-direct-box">
              <h4 style="margin: 0 0 0.4rem 0;">Dynamic PayPal Business Checkout</h4>
              <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.85rem;">
                When enabled with PayPal Business API credentials on the server, PayPal creates a locked order for <strong>${this.escapeHtml(exactAmountStr)}</strong> (${this.escapeHtml(inv.currency_code)}) referencing Invoice <strong>${this.escapeHtml(inv.invoice_number)}</strong>.
              </p>
              ${s.paypal_checkout_supported ? `
                <button type="button" class="btn btn-primary" onclick="AvioraPayments.startDynamicPayPalOrder(${inv.id})">
                  Create Dynamic PayPal Order (${this.escapeHtml(exactAmountStr)}) →
                </button>
              ` : `
                <div class="paypal-qr-limitation-alert">
                  <strong>PayPal Business API Not Configured on Server:</strong> Dynamic PayPal order checkout requires server PayPal API keys (never exposed on the client). Please use the <strong>PayPal QR Code Payment (Scan to Pay)</strong> tab or send exact <strong>${this.escapeHtml(exactAmountStr)}</strong> to <strong>${this.escapeHtml(holderName)} (${this.escapeHtml(holderContact)})</strong>, then upload your confirmation screenshot right here.
                </div>
              `}
            </div>
          `}
        </div>

        <!-- Right Column: Required Proof of Payment Upload & Status -->
        <div class="paypal-panel-card">
          <h3 style="margin: 0 0 0.35rem 0;">Required Proof of Payment</h3>
          <p style="font-size: 0.83rem; color: var(--text-secondary); margin: 0 0 1rem 0; line-height: 1.45;">
            After sending <strong>${this.escapeHtml(exactAmountStr)}</strong> via PayPal, upload a screenshot of your confirmation receipt. Your status starts as <strong>Pending</strong> until the Administrator verifies funds receipt.
          </p>

          ${latestRejection && canSubmitProof ? `
            <div class="paypal-rejection-banner">
              <strong>Previous Submission Marked as Not Received:</strong>
              <div>${this.escapeHtml(latestRejection.admin_notes || 'Please verify your PayPal payment and submit a new proof screenshot.')}</div>
            </div>
          ` : ''}

          ${isAccepted ? `
            <div class="paypal-accepted-banner">
              <strong>Payment Accepted &amp; Verified</strong>
              <p>This invoice has been verified by the Administrator and your sessions/package are active. No duplicate submission needed.</p>
            </div>
          ` : hasPendingPayment ? `
            <div class="paypal-pending-banner">
              <strong>Pending Administrator Verification</strong>
              <p>Your proof of payment for <strong>${this.escapeHtml(inv.invoice_number)}</strong> (${this.escapeHtml(exactAmountStr)}) has been submitted and is currently awaiting Administrator review. Duplicate uploads are disabled while under review.</p>
            </div>
          ` : `
            <form id="paypal-proof-submit-form" onsubmit="event.preventDefault(); AvioraPayments.submitProofForm(${inv.id});">
              <div class="paypal-readonly-amount-pill">
                <span>Locked Invoice Amount:</span>
                <strong>${this.escapeHtml(exactAmountStr)} (${this.escapeHtml(inv.invoice_number)})</strong>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <label class="form-label" for="proof-screenshot-input">Proof Screenshot (JPG, JPEG, PNG — Max 5MB) *</label>
                <input type="file" id="proof-screenshot-input" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style="display: none;" onchange="AvioraPayments.onProofFileSelected(this)" />
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline-gold btn-sm" id="btn-trigger-proof-upload" onclick="document.getElementById('proof-screenshot-input').click()">
                    Upload Screenshot
                  </button>
                  <span id="proof-selected-filename" style="font-size: 0.78rem; color: var(--text-secondary);">No screenshot selected yet (required)</span>
                </div>
                <div id="proof-preview-wrap" class="paypal-proof-preview-wrap" style="display: none;">
                  <img id="proof-preview-img" src="" alt="Proof of Payment Preview" class="paypal-proof-preview-img" />
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.45rem;">
                    <span id="proof-preview-meta" style="font-size: 0.74rem; color: var(--text-secondary);"></span>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.18rem 0.55rem; font-size: 0.72rem;" onclick="AvioraPayments.clearProofSelection()">Remove</button>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="paypal-ref-input">PayPal Reference # (Optional)</label>
                  <input type="text" id="paypal-ref-input" class="form-control" maxlength="100" placeholder="e.g. 9AB12345CD678901E" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="paypal-date-input">Payment Date</label>
                  <input type="date" id="paypal-date-input" class="form-control" value="${todayIso}" />
                </div>
              </div>

              <button type="submit" id="btn-submit-paypal-proof" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 0.85rem; font-weight: 700;">
                ${inv.status === 'not_received' ? 'Submit New Proof &amp; Retry Verification →' : 'Submit Proof of Payment for Verification →'}
              </button>
            </form>
          `}
        </div>
      </div>
    `;
  },

  onProofFileSelected(inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const ext = (file.name || '').toLowerCase();
    const okType = ['image/jpeg', 'image/jpg', 'image/png'].includes((file.type || '').toLowerCase()) || /\.(jpe?g|png)$/i.test(ext);
    if (!okType) {
      showToast('Unsupported file format. Only JPG, JPEG, and PNG screenshots are allowed.', 'error');
      inputEl.value = '';
      this.clearProofSelection();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot file exceeds the 5MB maximum size.', 'error');
      inputEl.value = '';
      this.clearProofSelection();
      return;
    }
    this.pendingProofFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.pendingProofPreviewUrl = e.target.result;
      const wrap = document.getElementById('proof-preview-wrap');
      const img = document.getElementById('proof-preview-img');
      const nameSpan = document.getElementById('proof-selected-filename');
      const metaSpan = document.getElementById('proof-preview-meta');
      if (nameSpan) nameSpan.textContent = file.name;
      if (metaSpan) metaSpan.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
      if (img) img.src = this.pendingProofPreviewUrl;
      if (wrap) wrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  },

  clearProofSelection() {
    this.pendingProofFile = null;
    this.pendingProofPreviewUrl = null;
    const inp = document.getElementById('proof-screenshot-input');
    if (inp) inp.value = '';
    const wrap = document.getElementById('proof-preview-wrap');
    if (wrap) wrap.style.display = 'none';
    const nameSpan = document.getElementById('proof-selected-filename');
    if (nameSpan) nameSpan.textContent = 'No screenshot selected yet (required)';
  },

  async startDynamicPayPalOrder(invoiceId) {
    try {
      const res = await API.createPayPalOrder(invoiceId);
      if (res && res.approveUrl) {
        window.open(res.approveUrl, '_blank', 'noopener,noreferrer');
        showToast(`PayPal Order ${res.orderId} opened for exact invoice amount. Enter order ID ${res.orderId} below and upload your confirmation screenshot.`, 'info');
        const refEl = document.getElementById('paypal-ref-input');
        if (refEl && !refEl.value) refEl.value = res.orderId;
      }
    } catch (err) {
      showToast(err.message || 'Could not initiate PayPal order.', 'warning');
    }
  },

  async submitProofForm(invoiceId) {
    if (!this.pendingProofFile) {
      showToast('Proof of Payment is required. Please upload your JPG, JPEG, or PNG screenshot before submitting.', 'error');
      return;
    }
    const inv = this.studentInvoices.find(i => i.id === invoiceId);
    if (!inv) {
      showToast('Invoice not found.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-paypal-proof');
    const origText = submitBtn ? submitBtn.innerHTML : '';
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Uploading &amp; Submitting Proof...</span>';
      }
      const formData = new FormData();
      formData.append('proof', this.pendingProofFile);
      formData.append('payment_channel', this.selectedChannel || 'paypal_qr');
      formData.append('submitted_amount', String(inv.amount));
      const refVal = document.getElementById('paypal-ref-input')?.value.trim() || '';
      const dateVal = document.getElementById('paypal-date-input')?.value || '';
      if (refVal) formData.append('paypal_reference_number', refVal);
      if (dateVal) formData.append('payment_date', dateVal);

      const res = await API.submitInvoiceProof(invoiceId, formData);
      this.clearProofSelection();
      showToast(res.message || 'Proof of payment submitted! Status is Pending Administrator verification.', 'success');
      await this.loadStudentPaymentsPage();
      if (typeof Auth !== 'undefined' && Auth.loadNotifications) Auth.loadNotifications();
      if (typeof Student !== 'undefined' && Student.loadDashboard) Student.loadDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to submit proof of payment.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  },

  renderStudentHistory() {
    const container = document.getElementById('student-paypal-history-list');
    if (!container) return;

    if (!this.studentInvoices || this.studentInvoices.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
          <h3 class="empty-title">No PayPal Invoices or Payments Yet</h3>
          <p class="empty-desc">Your generated invoices, uploaded PayPal screenshots, and verification statuses will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.studentInvoices.map(inv => {
      const st = this.statusMeta(inv.status);
      const amtStr = this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol);
      const latest = inv.latest_payment;
      const canAct = !latest || (inv.status === 'not_received' && latest.status !== 'pending');
      return `
        <div class="paypal-history-card">
          <div class="paypal-history-top">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <strong style="font-size: 0.96rem;">${this.escapeHtml(inv.invoice_number)}</strong>
                <span class="paypal-status-badge ${st.cls}">${st.label}</span>
              </div>
              <div style="font-weight: 700; margin-top: 0.25rem;">${this.escapeHtml(inv.title)}</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">
                ${this.escapeHtml(inv.description || '')} • Created ${this.formatDateTime(inv.created_at)}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.2rem; font-weight: 800; color: var(--gold-700); font-family: var(--font-heading);">${this.escapeHtml(amtStr)}</div>
              ${latest ? `<div style="font-size: 0.72rem; color: var(--text-secondary);">Ref: ${this.escapeHtml(latest.transaction_code)}</div>` : ''}
            </div>
          </div>

          ${Array.isArray(inv.payments) && inv.payments.length > 0 ? `
            <div class="paypal-attempts-list">
              ${inv.payments.map(p => {
                const pm = this.statusMeta(p.status);
                return `
                  <div class="paypal-attempt-row">
                    <div>
                      <div style="font-size: 0.8rem; font-weight: 700;">
                        ${this.escapeHtml(p.transaction_code)} • <span class="paypal-status-badge ${pm.cls}" style="font-size: 0.68rem;">${pm.label}</span>
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        Submitted: ${this.formatDateTime(p.submitted_at)} • Pay Date: ${this.escapeHtml(p.payment_date || '—')}
                        ${p.paypal_reference_number ? ` • PayPal Ref: <code>${this.escapeHtml(p.paypal_reference_number)}</code>` : ''}
                      </div>
                      ${p.admin_notes ? `<div style="font-size: 0.76rem; color: var(--gold-800); margin-top: 0.2rem;"><strong>Admin Note:</strong> ${this.escapeHtml(p.admin_notes)}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraPayments.viewProofScreenshot(${p.id})">
                      View Proof Screenshot
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <div class="paypal-history-actions">
            ${inv.status === 'unpaid' ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="AvioraPayments.selectInvoiceForPayment(${inv.id})">
                Proceed to PayPal &amp; Upload Proof →
              </button>
            ` : inv.status === 'not_received' && canAct ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="AvioraPayments.selectInvoiceForPayment(${inv.id})">
                Retry Payment &amp; Upload New Proof →
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  async renderStudentDashboardBillingSummary() {
    const container = document.getElementById('student-paypal-dash-summary');
    if (!container) return;
    try {
      const data = await API.getStudentPayments();
      const invoices = data.invoices || [];
      this.studentInvoices = invoices;
      this.paymentSettings = data.settings || {};

      const pendingCount = invoices.filter(i => i.status === 'pending_verification').length;
      const unpaidOrRejected = invoices.filter(i => ['unpaid', 'not_received'].includes(i.status));
      const latestThree = invoices.slice(0, 3);

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.85rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge-gold">Invoices: ${invoices.length}</span>
            ${pendingCount > 0 ? `<span class="paypal-status-badge paypal-status-pending">${pendingCount} Pending Admin Verification</span>` : ''}
            ${unpaidOrRejected.length > 0 ? `<span class="paypal-status-badge paypal-status-rejected">${unpaidOrRejected.length} Action Needed</span>` : ''}
          </div>
          <a href="#student-payments" class="btn btn-primary btn-sm">Open PayPal Payments &amp; Invoices →</a>
        </div>
        ${latestThree.length === 0 ? `
          <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">No PayPal invoices yet. Select <strong>PayPal</strong> during tutor or package checkout to pay via official Admin QR or PayPal Checkout and upload proof.</p>
        ` : latestThree.map(inv => {
          const st = this.statusMeta(inv.status);
          return `
            <div class="paypal-attempt-row">
              <div>
                <strong>${this.escapeHtml(inv.invoice_number)}</strong> — ${this.escapeHtml(inv.title)}
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${this.escapeHtml(this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol))} • <span class="paypal-status-badge ${st.cls}" style="font-size: 0.68rem;">${st.label}</span></div>
              </div>
              <a href="#student-payments?invoice=${encodeURIComponent(inv.invoice_number)}" class="btn btn-outline-gold btn-sm">View / Manage</a>
            </div>
          `;
        }).join('')}
      `;
    } catch (e) {
      container.innerHTML = `<a href="#student-payments" class="btn btn-outline-gold btn-sm">Open PayPal Payments &amp; Invoices</a>`;
    }
  },

  async viewProofScreenshot(paymentId) {
    try {
      showToast('Loading protected payment proof...', 'info');
      const res = await API.getPaymentProofImage(paymentId);
      if (res && res.proof_image_data) {
        this.openImageModal(
          res.proof_image_data,
          `Proof of Payment — Invoice ${res.invoice_number} (${res.transaction_code}) • ${res.proof_filename}`
        );
      }
    } catch (err) {
      showToast(err.message || 'Unable to load proof screenshot.', 'error');
    }
  },

  openImageModal(src, caption = '') {
    const modal = document.getElementById('paypal-image-lightbox-modal');
    const img = document.getElementById('paypal-lightbox-img');
    const cap = document.getElementById('paypal-lightbox-caption');
    if (!modal || !img) return;
    img.src = src;
    if (cap) cap.textContent = caption;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeImageModal() {
    const modal = document.getElementById('paypal-image-lightbox-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  copyText(val, successMsg = 'Copied!') {
    if (!val) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(() => showToast(successMsg, 'success')).catch(() => showToast(val, 'info'));
    } else {
      showToast(val, 'info');
    }
  },

  // ==========================================
  // ADMIN PAYPAL VERIFICATION & PAYMENT SETTINGS
  // ==========================================
  async loadAdminPayments(status = this.adminFilter || 'all') {
    this.adminFilter = status;
    const container = document.getElementById('admin-paypal-payments-list');
    try {
      const searchVal = document.getElementById('admin-paypal-search')?.value.trim() || this.adminSearch || '';
      const data = await API.getAdminPayPalPayments(status, searchVal);
      this.adminPayments = data.payments || [];
      this.adminCounts = data.counts || { all: 0, pending: 0, accepted: 0, not_received: 0 };
      this.paymentSettings = data.settings || {};

      const badge = document.getElementById('admin-paypal-pending-badge');
      if (badge) {
        if (this.adminCounts.pending > 0) {
          badge.textContent = this.adminCounts.pending;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
      const countAll = document.getElementById('count-paypal-all');
      const countPending = document.getElementById('count-paypal-pending');
      const countAccepted = document.getElementById('count-paypal-accepted');
      const countRejected = document.getElementById('count-paypal-not-received');
      if (countAll) countAll.textContent = this.adminCounts.all || 0;
      if (countPending) countPending.textContent = this.adminCounts.pending || 0;
      if (countAccepted) countAccepted.textContent = this.adminCounts.accepted || 0;
      if (countRejected) countRejected.textContent = this.adminCounts.not_received || 0;

      if (container) this.renderAdminPaymentsList(container);
    } catch (err) {
      console.error('Admin PayPal load error:', err);
      if (container) container.innerHTML = `<div style="padding: 1.5rem; color: #EF4444;">${this.escapeHtml(err.message || 'Failed to load PayPal payments.')}</div>`;
    }
  },

  renderAdminPaymentsList(container) {
    if (!this.adminPayments || this.adminPayments.length === 0) {
      container.innerHTML = `
        <div class="admin-card" style="padding: 2.5rem; text-align: center; color: var(--charcoal-400);">
          No PayPal payment submissions match the selected filter.
        </div>
      `;
      return;
    }

    container.innerHTML = this.adminPayments.map(p => {
      const st = this.statusMeta(p.status);
      const amtStr = p.formatted_amount || this.formatMoney(p.amount, p.currency_code, p.currency_symbol);
      const logs = Array.isArray(p.audit_logs) ? p.audit_logs.slice(0, 4) : [];
      return `
        <div class="paypal-admin-verify-card" id="admin-paypal-card-${p.id}">
          <div class="paypal-admin-verify-top">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <strong style="font-size: 1.02rem; color: #FFFFFF;">${this.escapeHtml(p.invoice_number)}</strong>
                <span class="paypal-status-badge ${st.cls}">${st.label}</span>
                <span style="font-size: 0.74rem; color: #CBD5E1;">Tx: ${this.escapeHtml(p.transaction_code)}</span>
              </div>
              <div style="font-size: 0.9rem; font-weight: 700; color: #F8FAFC; margin-top: 0.25rem;">
                ${this.escapeHtml(p.student_name)} <span style="font-weight: 400; color: #94A3B8;">(${this.escapeHtml(p.student_email)} • ID #${p.student_id}${p.student_phone ? ' • ' + this.escapeHtml(p.student_phone) : ''})</span>
              </div>
              <div style="font-size: 0.82rem; color: #CBD5E1; margin-top: 0.15rem;">
                ${this.escapeHtml(p.invoice_title)} — ${this.escapeHtml(p.invoice_description || '')}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.35rem; font-weight: 900; color: #F0B84A; font-family: var(--font-heading);">${this.escapeHtml(amtStr)}</div>
              <div style="font-size: 0.74rem; color: #94A3B8;">Recipient: ${this.escapeHtml(p.recipient_name)} (${this.escapeHtml(p.recipient_contact)})</div>
            </div>
          </div>

          <div class="paypal-admin-meta-grid">
            <div><span>Pay Date:</span> <strong>${this.escapeHtml(p.payment_date || '—')}</strong></div>
            <div><span>Submitted:</span> <strong>${this.formatDateTime(p.submitted_at)}</strong></div>
            <div><span>PayPal Ref / Order:</span> <strong>${this.escapeHtml(p.paypal_reference_number || p.paypal_order_id || 'N/A (QR Upload)')}</strong></div>
            <div><span>Verified By:</span> <strong>${p.verified_by_name ? `${this.escapeHtml(p.verified_by_name)} (${this.formatDateTime(p.verified_at)})` : 'Pending Admin Verification'}</strong></div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraPayments.viewProofScreenshot(${p.id})">
                View &amp; Enlarge Proof Screenshot (${this.escapeHtml(p.proof_filename)})
              </button>
              ${p.admin_notes ? `<span style="font-size: 0.78rem; color: #FDE68A;">Note: ${this.escapeHtml(p.admin_notes)}</span>` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${p.status === 'pending' ? `
                <button type="button" class="btn btn-sm" style="background: #10B981; color: #FFFFFF; border: none; font-weight: 700;" onclick="AvioraPayments.acceptAdminPaymentFlow(${p.id}, '${this.escapeHtml(amtStr)}', '${this.escapeHtml(p.invoice_number)}')">
                  ✓ Accept Payment
                </button>
                <button type="button" class="btn btn-sm" style="background: #DC2626; color: #FFFFFF; border: none; font-weight: 700;" onclick="AvioraPayments.rejectAdminPaymentFlow(${p.id}, '${this.escapeHtml(p.invoice_number)}')">
                  ✕ Mark as Not Received
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="AvioraPayments.requestMoreInfoFlow(${p.id}, '${this.escapeHtml(p.invoice_number)}')">
                  Request Verification Info
                </button>
              ` : ''}
            </div>
          </div>

          ${logs.length > 0 ? `
            <div class="paypal-audit-strip">
              <strong>Audit Log:</strong>
              ${logs.map(l => `<span>${this.escapeHtml(l.action)} (${this.escapeHtml(l.actor_name || 'System')} • ${this.formatDateTime(l.created_at)})</span>`).join(' • ')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  acceptAdminPaymentFlow(paymentId, amtStr, invoiceNum) {
    showConfirm(
      `Confirm that actual PayPal funds of ${amtStr} for ${invoiceNum} have been received in Stephanie Nicole Debo Manalo's PayPal account (09945586658)? Accepting will activate the student's booking.`,
      async () => {
        try {
          const res = await API.acceptAdminPayment(paymentId, {
            admin_notes: `Funds (${amtStr}) verified received in Admin PayPal (09945586658).`
          });
          showToast(res.message || 'Payment accepted!', 'success');
          await this.loadAdminPayments(this.adminFilter || 'all');
          if (typeof Admin !== 'undefined' && Admin.loadDashboardMetrics) Admin.loadDashboardMetrics();
        } catch (err) {
          showToast(err.message || 'Failed to accept payment.', 'error');
        }
      },
      { title: 'Confirm PayPal Funds Receipt', confirmText: 'Accept Payment', cancelText: 'Cancel' }
    );
  },

  async rejectAdminPaymentFlow(paymentId, invoiceNum) {
    const reason = prompt(
      `Enter reason for marking Invoice ${invoiceNum} as Not Received (visible to the student):`,
      'Funds not yet reflected in PayPal (09945586658) or screenshot unclear. Please verify and upload a new proof screenshot.'
    );
    if (reason === null) return;
    try {
      const res = await API.rejectAdminPayment(paymentId, { admin_notes: reason.trim() });
      showToast(res.message || 'Marked as Not Received and student notified.', 'warning');
      await this.loadAdminPayments(this.adminFilter || 'all');
    } catch (err) {
      showToast(err.message || 'Failed to mark payment as not received.', 'error');
    }
  },

  async requestMoreInfoFlow(paymentId, invoiceNum) {
    const msg = prompt(
      `Enter additional verification request message for Invoice ${invoiceNum}:`,
      'Please verify your PayPal Transaction Reference ID or upload a clearer confirmation screenshot showing the date and exact amount.'
    );
    if (msg === null || !msg.trim()) return;
    try {
      const res = await API.requestAdminPaymentVerification(paymentId, { message: msg.trim() });
      showToast(res.message || 'Verification inquiry sent to student.', 'info');
      await this.loadAdminPayments(this.adminFilter || 'all');
    } catch (err) {
      showToast(err.message || 'Failed to send verification request.', 'error');
    }
  },

  async loadAdminPaymentSettings() {
    try {
      const data = await API.getPaymentSettings();
      const s = data.settings || {};
      this.paymentSettings = s;

      const holderInp = document.getElementById('admin-paypal-holder-name');
      const contactInp = document.getElementById('admin-paypal-contact');
      const bizEmailInp = document.getElementById('admin-paypal-business-email');
      const apiBadge = document.getElementById('admin-paypal-api-status-badge');
      const qrPreview = document.getElementById('admin-paypal-qr-preview');
      const qrEmpty = document.getElementById('admin-paypal-qr-empty');

      if (holderInp) holderInp.value = s.paypal_holder_name || 'Stephanie Nicole Debo Manalo';
      if (contactInp) contactInp.value = s.paypal_contact || '09945586658';
      if (bizEmailInp) bizEmailInp.value = s.paypal_business_email || '';
      if (apiBadge) {
        apiBadge.textContent = s.paypal_checkout_supported ? 'PayPal Business REST API Connected' : 'Server API Keys Not Set (QR & Proof Verification Active)';
      }

      if (s.has_qr_image && s.qr_image_data) {
        if (qrPreview) {
          qrPreview.src = s.qr_image_data;
          qrPreview.style.display = 'block';
        }
        if (qrEmpty) qrEmpty.style.display = 'none';
      } else {
        if (qrPreview) qrPreview.style.display = 'none';
        if (qrEmpty) qrEmpty.style.display = 'block';
      }
    } catch (err) {
      console.error('Load admin payment settings error:', err);
    }
  },

  async saveAdminPaymentSettings(e) {
    if (e && e.preventDefault) e.preventDefault();
    const holder = document.getElementById('admin-paypal-holder-name')?.value.trim();
    const contact = document.getElementById('admin-paypal-contact')?.value.trim();
    const bizEmail = document.getElementById('admin-paypal-business-email')?.value.trim();
    try {
      const res = await API.updateAdminPaymentSettings({
        paypal_holder_name: holder,
        paypal_contact: contact,
        paypal_business_email: bizEmail
      });
      this.paymentSettings = res.settings;
      showToast(res.message || 'Admin PayPal recipient settings updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update PayPal recipient settings.', 'error');
    }
  },

  onAdminQrFileSelected(inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const ext = (file.name || '').toLowerCase();
    const okType = ['image/jpeg', 'image/jpg', 'image/png'].includes((file.type || '').toLowerCase()) || /\.(jpe?g|png)$/i.test(ext);
    if (!okType) {
      showToast('Please select a genuine JPG, JPEG, or PNG QR image.', 'error');
      inputEl.value = '';
      return;
    }
    this.pendingAdminQrFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const qrPreview = document.getElementById('admin-paypal-qr-preview');
      const qrEmpty = document.getElementById('admin-paypal-qr-empty');
      if (qrPreview) {
        qrPreview.src = e.target.result;
        qrPreview.style.display = 'block';
      }
      if (qrEmpty) qrEmpty.style.display = 'none';
    };
    reader.readAsDataURL(file);
  },

  async uploadAdminQrImage() {
    if (!this.pendingAdminQrFile) {
      showToast('Please choose a JPG or PNG QR code image first.', 'warning');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('qr_image', this.pendingAdminQrFile);
      const res = await API.uploadAdminPayPalQR(formData);
      this.paymentSettings = res.settings;
      this.pendingAdminQrFile = null;
      const inp = document.getElementById('admin-paypal-qr-file-input');
      if (inp) inp.value = '';
      showToast(res.message || 'Official Admin PayPal QR code saved!', 'success');
      await this.loadAdminPaymentSettings();
    } catch (err) {
      showToast(err.message || 'Failed to upload PayPal QR image.', 'error');
    }
  }
};

window.AvioraPayments = AvioraPayments;
