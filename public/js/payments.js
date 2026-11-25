/**
 * AVIORA EDUCATION - PAYPAL & GCASH PAYMENT, INVOICING & VERIFICATION SYSTEM
 */
const AvioraPayments = {
  studentInvoices: [],
  studentPayments: [],
  paymentSettings: null,
  activeInvoiceId: null,
  activeMountContainerId: null,
  inlineOnSubmitted: null,
  selectedApp: null,
  selectedMode: null,
  selectedChannel: 'paypal_details',
  confirmedSentInvoices: {},
  pendingOrderIds: {},
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

  renderPayPalIcon(size = 26) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7.8 20.5H5.2c-.5 0-.8-.4-.7-.9L6.8 5.2c.1-.6.6-1 1.2-1h5.6c2.7 0 4.4 1.3 4 3.9-.5 3.1-2.6 4.7-5.6 4.7h-1.8c-.5 0-.9.4-1 .9l-.8 5.9c-.1.5-.3.9-.6.9z" fill="#003087"/>
        <path d="M10.4 18.8l.7-4.5c.1-.5.5-.8 1-.8h1.5c2.5 0 4.3-1.2 4.8-3.8.4-2.1-.3-3.5-1.8-4.1-.4 2.8-2.4 4.4-5.4 4.4H9.5c-.5 0-.9.4-1 .9L7.4 18.8c0 .4.2.7.6.7h1.8c.3 0 .5-.3.6-.7z" fill="#0079C1"/>
      </svg>
    `;
  },

  renderGCashIcon(size = 26) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12.2 15.8c-2.6 0-4.6-1.9-4.6-4.4 0-2.6 2-4.5 4.7-4.5 1.3 0 2.4.5 3.2 1.3l-1.5 1.5c-.4-.4-1-.7-1.7-.7-1.5 0-2.5 1-2.5 2.4s1 2.4 2.5 2.4c1.1 0 1.9-.5 2.2-1.4h-2.3v-1.9h4.6c.1.4.1.8.1 1.2 0 2.6-1.9 4.1-4.7 4.1z" fill="#FFFFFF"/>
        <path d="M16.9 6.6c1.2.9 1.9 2.2 2 3.7" stroke="#BAE6FD" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M18.4 4.6c1.7 1.3 2.7 3.2 2.9 5.4" stroke="#E0F2FE" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    `;
  },

  getRawAmountValue(inv) {
    const code = String(inv?.currency_code || 'USD').toUpperCase();
    const zeroDec = ['JPY', 'KRW', 'VND', 'IDR'].includes(code);
    return zeroDec
      ? String(Math.round(Number(inv?.amount) || 0))
      : (Number(inv?.amount) || 0).toFixed(2);
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
    if (s === 'pending' || s === 'pending_verification') return { label: 'Pending Admin Review', cls: 'paypal-status-pending' };
    if (s === 'not_received') return { label: 'Not Received', cls: 'paypal-status-rejected' };
    return { label: 'Awaiting Payment', cls: 'paypal-status-unpaid' };
  },

  channelLabel(channel) {
    const c = String(channel || 'paypal_qr').toLowerCase();
    if (c === 'gcash_qr') return 'GCash — QR Code';
    if (c === 'gcash_details' || c === 'gcash_direct') return 'GCash — Payment Details (09945586658)';
    if (c === 'paypal_direct' || c === 'paypal_details' || c === 'paypal_checkout' || c === 'paypal_manual') {
      return 'PayPal App — Payment Details (snmanalo26@gmail.com)';
    }
    return 'PayPal App — QR Code';
  },

  async startInlinePaymentFlow({ containerId, invoicePayload, onSubmitted = null }) {
    const res = await API.createStudentInvoice(invoicePayload);
    if (!res || !res.invoice) {
      throw new Error('Could not generate payment invoice.');
    }
    const createdInv = res.invoice;
    this.paymentSettings = res.settings || this.paymentSettings || {};
    const existingIdx = this.studentInvoices.findIndex(i => i.id === createdInv.id);
    if (existingIdx >= 0) {
      this.studentInvoices[existingIdx] = createdInv;
    } else {
      this.studentInvoices.unshift(createdInv);
    }
    this.activeInvoiceId = createdInv.id;
    this.activeMountContainerId = containerId;
    this.inlineOnSubmitted = typeof onSubmitted === 'function' ? onSubmitted : null;
    this.confirmedSentInvoices[createdInv.id] = false;
    this.selectedApp = null;
    this.selectedMode = null;
    this.selectedChannel = 'paypal_details';
    this.clearProofSelection();
    this.renderStudentCheckout(containerId);
    showToast(`Invoice ${createdInv.invoice_number} created — choose PayPal or GCash to complete payment.`, 'info');
    return createdInv;
  },

  async createInvoiceAndGoToPayments(invoicePayload) {
    // Fallback compatibility wrapper if called without inline container
    const modal = document.getElementById('student-invoice-payment-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      return this.startInlinePaymentFlow({
        containerId: 'student-modal-paypal-inline-container',
        invoicePayload
      });
    }
    const res = await API.createStudentInvoice(invoicePayload);
    return res.invoice;
  },

  async openInvoicePaymentModal(invoiceId) {
    const modal = document.getElementById('student-invoice-payment-modal');
    if (!modal) return;
    try {
      const data = await API.getStudentPayments();
      this.studentInvoices = data.invoices || [];
      this.studentPayments = data.payments || [];
      this.paymentSettings = data.settings || {};
    } catch (e) {}
    this.activeInvoiceId = Number(invoiceId);
    this.activeMountContainerId = 'student-modal-paypal-inline-container';
    this.inlineOnSubmitted = null;
    this.confirmedSentInvoices[this.activeInvoiceId] = false;
    this.selectedApp = null;
    this.selectedMode = null;
    this.selectedChannel = 'paypal_details';
    this.clearProofSelection();
    const inv = this.studentInvoices.find(i => i.id === this.activeInvoiceId);
    const titleEl = document.getElementById('student-invoice-modal-title');
    if (titleEl && inv) {
      titleEl.textContent = `Pay Invoice ${inv.invoice_number} (${this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol)})`;
    }
    this.renderStudentCheckout('student-modal-paypal-inline-container');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  async openInvoicePaymentModalByNumber(invoiceNumber) {
    try {
      const data = await API.getStudentPayments();
      this.studentInvoices = data.invoices || [];
      this.studentPayments = data.payments || [];
      this.paymentSettings = data.settings || {};
      const matched = this.studentInvoices.find(i => i.invoice_number === invoiceNumber || String(i.id) === String(invoiceNumber));
      if (matched) {
        await this.openInvoicePaymentModal(matched.id);
      }
    } catch (e) {}
  },

  closeInvoicePaymentModal() {
    const modal = document.getElementById('student-invoice-payment-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  selectInvoiceForPayment(invoiceId) {
    return this.openInvoicePaymentModal(invoiceId);
  },

  selectApp(app) {
    if (app !== 'paypal' && app !== 'gcash') return;
    if (this.selectedApp !== app) {
      this.selectedApp = app;
      this.selectedMode = null;
      this.selectedChannel = `${app}_details`;
    }
    this.renderStudentCheckout(this.activeMountContainerId);
  },

  selectPaymentMode(mode) {
    if (mode !== 'details' && mode !== 'qr') return;
    if (!this.selectedApp) this.selectedApp = 'paypal';
    this.selectedMode = mode;
    this.selectedChannel = `${this.selectedApp}_${mode}`;
    this.renderStudentCheckout(this.activeMountContainerId);
  },

  selectChannel(channel) {
    const c = String(channel || '').toLowerCase();
    if (c.startsWith('gcash')) {
      this.selectedApp = 'gcash';
      this.selectedMode = c.includes('qr') ? 'qr' : 'details';
    } else {
      this.selectedApp = 'paypal';
      this.selectedMode = c.includes('qr') ? 'qr' : 'details';
    }
    this.selectedChannel = `${this.selectedApp}_${this.selectedMode}`;
    this.renderStudentCheckout(this.activeMountContainerId);
  },

  confirmPaymentSent(invoiceId) {
    this.confirmedSentInvoices[Number(invoiceId)] = true;
    this.renderStudentCheckout(this.activeMountContainerId);
    const proofBox = document.getElementById('paypal-proof-upload-section');
    if (proofBox) proofBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  resetPaymentSentStep(invoiceId) {
    this.confirmedSentInvoices[Number(invoiceId)] = false;
    this.clearProofSelection();
    this.renderStudentCheckout(this.activeMountContainerId);
  },

  async proceedToPayPalAccount(invoiceId) {
    const inv = this.studentInvoices.find(i => i.id === Number(invoiceId));
    if (!inv) {
      showToast('Invoice not found.', 'error');
      return;
    }

    let payWin = null;
    try {
      payWin = window.open('about:blank', '_blank');
      if (payWin && payWin.document) {
        payWin.document.write('<p style="font-family:sans-serif;padding:2rem;">Redirecting securely to PayPal with your exact invoice amount...</p>');
      }
    } catch (e) {}

    let redirectUrl = inv.paypal_redirect_url || '';
    try {
      const res = await API.getPayPalRedirectUrl(inv.id);
      if (res && res.redirectUrl) {
        redirectUrl = res.redirectUrl;
        inv.paypal_redirect_url = redirectUrl;
        inv.paypal_redirect_mode = res.mode;
        if (res.orderId) {
          this.pendingOrderIds[inv.id] = res.orderId;
        }
      }
    } catch (err) {
      if (!redirectUrl) {
        if (payWin) try { payWin.close(); } catch (e) {}
        showToast(err.message || 'Could not open PayPal checkout.', 'error');
        return;
      }
    }

    if (payWin && !payWin.closed && redirectUrl) {
      payWin.location.href = redirectUrl;
    } else if (redirectUrl) {
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    }

    this.selectedApp = 'paypal';
    this.selectedMode = 'details';
    this.selectedChannel = 'paypal_details';
    this.confirmedSentInvoices[inv.id] = true;
    this.renderStudentCheckout(this.activeMountContainerId);
    const refInput = document.getElementById('paypal-ref-input');
    if (refInput && this.pendingOrderIds[inv.id]) {
      refInput.value = this.pendingOrderIds[inv.id];
    }
    const proofBox = document.getElementById('paypal-proof-upload-section');
    if (proofBox) proofBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  renderStudentCheckout(targetContainerId = null) {
    const resolvedId = targetContainerId || this.activeMountContainerId || 'student-paypal-checkout-box';
    const box = document.getElementById(resolvedId);
    if (!box) return;
    this.activeMountContainerId = resolvedId;

    const isCompact = ['page-booking-paypal-inline-container', 'buddy-paypal-inline-container'].includes(resolvedId);
    const inv = this.studentInvoices.find(i => i.id === this.activeInvoiceId) || null;
    const s = this.paymentSettings || {};
    const paypalHolderName = s.paypal_holder_name || 'Stephanie Nicole Debo Manalo';
    const paypalEmail = s.paypal_email || s.paypal_business_email || 'snmanalo26@gmail.com';
    const paypalQrUrl = s.paypal_qr_url || s.qr_image_data || '/assets/paypal-qr.jpg';
    const gcashHolderName = s.gcash_holder_name || 'ST******E N****E M.';
    const gcashNumber = s.gcash_number || '09945586658';
    const gcashQrUrl = s.gcash_qr_url || '/assets/gcash-qr.jpg';

    if (!inv) {
      box.innerHTML = '';
      return;
    }

    const stMeta = this.statusMeta(inv.status);
    const exactAmountStr = this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol);
    const rawExactAmt = this.getRawAmountValue(inv);
    const hasPendingPayment = Array.isArray(inv.payments) && inv.payments.some(p => p.status === 'pending');
    const isAccepted = inv.status === 'accepted';
    const canSubmitProof = !hasPendingPayment && !isAccepted && ['unpaid', 'not_received'].includes(inv.status);
    const latestRejection = Array.isArray(inv.payments) ? inv.payments.find(p => p.status === 'not_received') : null;
    const todayIso = new Date().toISOString().slice(0, 10);

    const hasApp = this.selectedApp === 'paypal' || this.selectedApp === 'gcash';
    const hasMode = hasApp && (this.selectedMode === 'details' || this.selectedMode === 'qr');
    const isPayPal = this.selectedApp === 'paypal';
    const isGcash = this.selectedApp === 'gcash';
    const chosenAppLabel = isGcash ? 'GCash' : 'PayPal';
    const chosenChannelText = this.channelLabel(this.selectedChannel);

    box.innerHTML = `
      <div class="paypal-process-bar">
        <div class="paypal-process-step active">
          <span class="paypal-step-num">1</span>
          <span>Choose PayPal or GCash</span>
        </div>
        <div class="paypal-process-step ${hasApp || hasPendingPayment || isAccepted ? 'active' : ''}">
          <span class="paypal-step-num">2</span>
          <span>Details or QR Code</span>
        </div>
        <div class="paypal-process-step ${hasMode || hasPendingPayment || isAccepted ? 'active' : ''}">
          <span class="paypal-step-num">3</span>
          <span>Upload Proof Screenshot</span>
        </div>
      </div>

      <div class="paypal-checkout-shell ${isCompact ? 'is-compact' : ''}">
        <div class="paypal-panel-card">
          <div class="paypal-panel-header">
            <div>
              <div class="paypal-eyebrow">Exact Invoice Generated</div>
              <h2 class="paypal-inv-num">${this.escapeHtml(inv.invoice_number)}</h2>
              <div class="paypal-inv-title">${this.escapeHtml(inv.title)}</div>
              <div class="paypal-inv-sub">${this.escapeHtml(inv.description || '')}</div>
            </div>
            <div style="text-align: right;">
              <span class="paypal-status-badge ${stMeta.cls}">${stMeta.label}</span>
              <div class="paypal-amount-label" style="margin-top: 0.45rem;">Exact Amount Due</div>
              <div class="paypal-exact-amount" id="paypal-locked-invoice-amount">${this.escapeHtml(exactAmountStr)}</div>
              <div class="paypal-amount-lock-note">Locked to invoice • Do not alter</div>
            </div>
          </div>

          ${inv.discount_amount > 0 ? `
            <div class="paypal-voucher-strip">
              Voucher <strong>${this.escapeHtml(inv.voucher_code)}</strong> applied (${inv.discount_percent}% off • Saved ${this.escapeHtml(this.formatMoney(inv.discount_amount, inv.currency_code, inv.currency_symbol))})
            </div>
          ` : ''}

          ${latestRejection && canSubmitProof ? `
            <div class="paypal-rejection-banner">
              <strong>Previous Submission Marked as Not Received:</strong>
              <div>${this.escapeHtml(latestRejection.admin_notes || 'Please verify your transfer and submit a new proof screenshot.')}</div>
            </div>
          ` : ''}

          <!-- Important Exact Amount Reminder Note -->
          <div class="pay-exact-note-banner">
            <div style="display: flex; align-items: flex-start; gap: 0.55rem; flex: 1; min-width: 220px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong>Important Note:</strong> Please send the <strong>exact amount (${this.escapeHtml(exactAmountStr)})</strong> to facilitate easier confirmation and verification.
              </div>
            </div>
            <button type="button" class="btn btn-outline-gold btn-sm" style="padding: 0.25rem 0.65rem; font-size: 0.74rem; font-weight: 700; white-space: nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(rawExactAmt)}', 'Exact amount (${this.escapeHtml(exactAmountStr)}) copied')">
              Copy Exact Amount (${this.escapeHtml(rawExactAmt)})
            </button>
          </div>

          ${isAccepted ? `
            <div class="paypal-accepted-banner" style="margin-top: 1rem;">
              <strong>Payment Accepted &amp; Verified</strong>
              <p>The Administrator verified funds receipt for ${this.escapeHtml(exactAmountStr)} and activated your lesson/package.</p>
            </div>
          ` : hasPendingPayment ? `
            <div class="paypal-pending-banner" style="margin-top: 1rem;">
              <strong>Pending Admin Review</strong>
              <p>Your proof of payment for <strong>${this.escapeHtml(inv.invoice_number)}</strong> (${this.escapeHtml(exactAmountStr)}) has been submitted! Status is <strong>Pending Admin Review</strong> until the Administrator verifies real funds arrived.</p>
              <a href="#student-portal" class="btn btn-primary btn-sm" style="margin-top: 0.6rem;" onclick="AvioraPayments.finishInlineFlowToDashboard()">View Live Status in Student Dashboard →</a>
            </div>
          ` : `
            <!-- STEP 1: CHOOSE PAYMENT METHOD (PAYPAL APP OR GCASH) -->
            <div class="pay-section-block" id="pay-step-app-section">
              <div class="pay-section-heading">
                <span class="paypal-step-num" style="width:20px;height:20px;font-size:0.68rem;">1</span>
                <span>Select Payment App (PayPal or GCash)</span>
              </div>
              <div class="pay-app-grid">
                <button type="button" id="pay-app-card-paypal" class="pay-app-card ${isPayPal ? 'active' : ''}" onclick="AvioraPayments.selectApp('paypal')">
                  <div class="pay-app-card-left">
                    <span class="pay-app-icon-wrap" aria-hidden="true">${this.renderPayPalIcon(26)}</span>
                    <div>
                      <div class="pay-app-title">PayPal</div>
                      <div class="pay-app-sub">Pay via PayPal app details or PayPal QR code</div>
                    </div>
                  </div>
                  <span class="pay-card-radio">✓</span>
                </button>

                <button type="button" id="pay-app-card-gcash" class="pay-app-card ${isGcash ? 'active' : ''}" onclick="AvioraPayments.selectApp('gcash')">
                  <div class="pay-app-card-left">
                    <span class="pay-app-icon-wrap is-gcash" aria-hidden="true">${this.renderGCashIcon(26)}</span>
                    <div>
                      <div class="pay-app-title">GCash</div>
                      <div class="pay-app-sub">Pay via GCash details or InstaPay QR code</div>
                    </div>
                  </div>
                  <span class="pay-card-radio">✓</span>
                </button>
              </div>
              ${!hasApp ? `
                <div class="pay-hint-strip">
                  Choose <strong>PayPal</strong> or <strong>GCash</strong> above to view payment details or QR code. A confirmation screenshot upload will be required at the end.
                </div>
              ` : ''}
            </div>

            ${hasApp ? `
              <!-- STEP 2: CHOOSE PAYMENT DETAILS OR QR CODE FOR SELECTED APP -->
              <div class="pay-section-block" id="pay-step-mode-section">
                <div class="pay-section-heading">
                  <span class="paypal-step-num" style="width:20px;height:20px;font-size:0.68rem;">2</span>
                  <span>Choose How to Pay with ${this.escapeHtml(chosenAppLabel)}</span>
                </div>
                <div class="pay-mode-grid">
                  <button type="button" id="pay-mode-card-details" class="pay-mode-card ${this.selectedMode === 'details' ? 'active' : ''}" onclick="AvioraPayments.selectPaymentMode('details')">
                    <div class="pay-app-card-left">
                      <span class="pay-app-icon-wrap" style="width:36px;height:36px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C68A28" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </span>
                      <div>
                        <div class="pay-app-title">Payment Details</div>
                        <div class="pay-app-sub">Copy ${this.escapeHtml(chosenAppLabel)} recipient details to pay in app</div>
                      </div>
                    </div>
                    <span class="pay-card-radio">✓</span>
                  </button>

                  <button type="button" id="pay-mode-card-qr" class="pay-mode-card ${this.selectedMode === 'qr' ? 'active' : ''}" onclick="AvioraPayments.selectPaymentMode('qr')">
                    <div class="pay-app-card-left">
                      <span class="pay-app-icon-wrap" style="width:36px;height:36px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C68A28" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3h-3z"></path><path d="M17 17h4v4h-4z"></path></svg>
                      </span>
                      <div>
                        <div class="pay-app-title">QR Code</div>
                        <div class="pay-app-sub">Scan the official ${this.escapeHtml(chosenAppLabel)} QR code</div>
                      </div>
                    </div>
                    <span class="pay-card-radio">✓</span>
                  </button>
                </div>
                ${!hasMode ? `
                  <div class="pay-hint-strip">
                    Select <strong>Payment Details</strong> or <strong>QR Code</strong> above for <strong>${this.escapeHtml(chosenAppLabel)}</strong>.
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${hasMode && isPayPal && this.selectedMode === 'details' ? `
              <!-- PAYPAL PAYMENT DETAILS -->
              <div class="pay-details-card" id="paypal-details-panel">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
                  <div class="paypal-recipient-badge" style="margin-bottom:0;display:inline-flex;align-items:center;gap:0.35rem;">
                    ${this.renderPayPalIcon(15)} Official PayPal Recipient Details
                  </div>
                  <span style="font-size:0.72rem;color:var(--text-secondary);font-weight:700;">Tap Copy to complete inside PayPal app</span>
                </div>

                <div class="pay-copy-grid">
                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">PayPal Email Address</div>
                      <div class="pay-copy-value">${this.escapeHtml(paypalEmail)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(paypalEmail)}', 'PayPal email copied: ${this.escapeHtml(paypalEmail)}')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">Exact Amount to Send</div>
                      <div class="pay-copy-value">${this.escapeHtml(exactAmountStr)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(rawExactAmt)}', 'Exact amount copied: ${this.escapeHtml(exactAmountStr)}')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">Account Holder</div>
                      <div class="pay-copy-value">${this.escapeHtml(paypalHolderName)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(paypalHolderName)}', 'Account holder copied')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">Invoice Reference</div>
                      <div class="pay-copy-value">${this.escapeHtml(inv.invoice_number)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(inv.invoice_number)}', 'Invoice reference copied')">Copy</button>
                  </div>
                </div>

                <ol class="paypal-steps-list" style="margin-bottom:0.75rem;">
                  <li>Open the <strong>PayPal</strong> app (or tap <strong>Open PayPal Website</strong> below) and choose <strong>Send Money</strong>.</li>
                  <li>Copy and paste email <strong>${this.escapeHtml(paypalEmail)}</strong> as the recipient.</li>
                  <li>Send the exact amount of <strong>${this.escapeHtml(exactAmountStr)}</strong> to facilitate easier confirmation and verification.</li>
                  <li>Take a screenshot of your PayPal receipt and upload it below as proof of payment.</li>
                </ol>

                <button type="button" id="btn-proceed-paypal-redirect" class="btn btn-outline-gold btn-sm" style="width:100%;justify-content:center;font-weight:700;" onclick="AvioraPayments.proceedToPayPalAccount(${inv.id})">
                  Open PayPal Website with Prefilled Amount (${this.escapeHtml(exactAmountStr)}) ↗
                </button>
              </div>
            ` : ''}

            ${hasMode && isPayPal && this.selectedMode === 'qr' ? `
              <!-- PAYPAL QR CODE -->
              <div class="pay-details-card" id="paypal-qr-panel">
                <div class="paypal-recipient-badge" style="display:inline-flex;align-items:center;gap:0.35rem;">
                  ${this.renderPayPalIcon(15)} Official PayPal QR Code
                </div>
                <div class="paypal-qr-section" style="margin-top:0.5rem;">
                  <div class="paypal-qr-preview-col">
                    <div class="paypal-qr-frame">
                      <img id="student-official-paypal-qr" src="${this.escapeHtml(paypalQrUrl)}" alt="Official PayPal QR Code" class="paypal-qr-img" onclick="AvioraPayments.openImageModal('${this.escapeHtml(paypalQrUrl)}', 'Official PayPal QR Code — ${this.escapeHtml(paypalEmail)}')" />
                    </div>
                    <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                      <button type="button" class="btn btn-outline-gold btn-sm" style="flex:1;justify-content:center;font-size:0.73rem;" onclick="AvioraPayments.openImageModal('${this.escapeHtml(paypalQrUrl)}', 'Official PayPal QR Code — ${this.escapeHtml(paypalEmail)}')">Enlarge</button>
                      <a href="${this.escapeHtml(paypalQrUrl)}" download="Aviora-PayPal-QR.jpg" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;font-size:0.73rem;text-decoration:none;">Save QR</a>
                    </div>
                  </div>
                  <div class="paypal-qr-instructions-col">
                    <div class="pay-copy-item" style="margin-bottom:0.6rem;">
                      <div>
                        <div class="paypal-field-label">PayPal Email / Exact Amount</div>
                        <div class="pay-copy-value" style="font-size:0.82rem;">${this.escapeHtml(paypalEmail)} • ${this.escapeHtml(exactAmountStr)}</div>
                      </div>
                      <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.2rem 0.55rem;font-size:0.72rem;" onclick="AvioraPayments.copyText('${this.escapeHtml(paypalEmail)}', 'PayPal email copied')">Copy Email</button>
                    </div>
                    <h4 style="margin:0 0 0.4rem 0;font-size:0.9rem;">Pay via PayPal QR Code</h4>
                    <ol class="paypal-steps-list" style="margin-bottom:0;">
                      <li>Open your <strong>PayPal</strong> app and tap the <strong>Scan / Pay</strong> button.</li>
                      <li>Scan the QR code on the left and confirm recipient <strong>${this.escapeHtml(paypalEmail)}</strong>.</li>
                      <li>Enter and send the <strong>exact amount (${this.escapeHtml(exactAmountStr)})</strong> to facilitate easier confirmation and verification.</li>
                      <li>Save a screenshot of the confirmation screen and upload it below.</li>
                    </ol>
                  </div>
                </div>
              </div>
            ` : ''}

            ${hasMode && isGcash && this.selectedMode === 'details' ? `
              <!-- GCASH PAYMENT DETAILS -->
              <div class="pay-details-card" id="gcash-details-panel">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
                  <div class="paypal-recipient-badge" style="margin-bottom:0;display:inline-flex;align-items:center;gap:0.35rem;">
                    <span class="pay-app-icon-wrap is-gcash" style="width:18px;height:18px;border-radius:4px;">${this.renderGCashIcon(13)}</span>
                    Official GCash Recipient Details
                  </div>
                  <span style="font-size:0.72rem;color:var(--text-secondary);font-weight:700;">Tap Copy to send via Express Send</span>
                </div>

                <div class="pay-copy-grid">
                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">GCash Mobile Number</div>
                      <div class="pay-copy-value">${this.escapeHtml(gcashNumber)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(gcashNumber)}', 'GCash number copied: ${this.escapeHtml(gcashNumber)}')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">GCash Account Name</div>
                      <div class="pay-copy-value">${this.escapeHtml(gcashHolderName)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(gcashHolderName)}', 'GCash account name copied')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">Exact Amount to Send</div>
                      <div class="pay-copy-value">${this.escapeHtml(exactAmountStr)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(rawExactAmt)}', 'Exact amount copied: ${this.escapeHtml(exactAmountStr)}')">Copy</button>
                  </div>

                  <div class="pay-copy-item">
                    <div>
                      <div class="paypal-field-label">Invoice Reference</div>
                      <div class="pay-copy-value">${this.escapeHtml(inv.invoice_number)}</div>
                    </div>
                    <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.25rem 0.65rem;font-size:0.74rem;white-space:nowrap;" onclick="AvioraPayments.copyText('${this.escapeHtml(inv.invoice_number)}', 'Invoice reference copied')">Copy</button>
                  </div>
                </div>

                <ol class="paypal-steps-list" style="margin-bottom:0;">
                  <li>Open your <strong>GCash</strong> app and tap <strong>Send</strong> → <strong>Express Send</strong>.</li>
                  <li>Copy and paste GCash number <strong>${this.escapeHtml(gcashNumber)}</strong> and verify the masked name reads <strong>${this.escapeHtml(gcashHolderName)}</strong>.</li>
                  <li>Enter the exact amount of <strong>${this.escapeHtml(exactAmountStr)}</strong> to facilitate easier confirmation and verification.</li>
                  <li>Complete the transfer, save a screenshot of your GCash receipt, and upload it below.</li>
                </ol>
              </div>
            ` : ''}

            ${hasMode && isGcash && this.selectedMode === 'qr' ? `
              <!-- GCASH QR CODE -->
              <div class="pay-details-card" id="gcash-qr-panel">
                <div class="paypal-recipient-badge" style="display:inline-flex;align-items:center;gap:0.35rem;">
                  <span class="pay-app-icon-wrap is-gcash" style="width:18px;height:18px;border-radius:4px;">${this.renderGCashIcon(13)}</span>
                  Official GCash QR Code (InstaPay)
                </div>
                <div class="paypal-qr-section" style="margin-top:0.5rem;">
                  <div class="paypal-qr-preview-col">
                    <div class="paypal-qr-frame">
                      <img id="student-official-gcash-qr" src="${this.escapeHtml(gcashQrUrl)}" alt="Official GCash QR Code" class="paypal-qr-img" onclick="AvioraPayments.openImageModal('${this.escapeHtml(gcashQrUrl)}', 'Official GCash QR Code — ${this.escapeHtml(gcashHolderName)} (${this.escapeHtml(gcashNumber)})')" />
                    </div>
                    <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                      <button type="button" class="btn btn-outline-gold btn-sm" style="flex:1;justify-content:center;font-size:0.73rem;" onclick="AvioraPayments.openImageModal('${this.escapeHtml(gcashQrUrl)}', 'Official GCash QR Code — ${this.escapeHtml(gcashHolderName)} (${this.escapeHtml(gcashNumber)})')">Enlarge</button>
                      <a href="${this.escapeHtml(gcashQrUrl)}" download="Aviora-GCash-QR.jpg" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;font-size:0.73rem;text-decoration:none;">Save QR</a>
                    </div>
                  </div>
                  <div class="paypal-qr-instructions-col">
                    <div class="pay-copy-item" style="margin-bottom:0.6rem;">
                      <div>
                        <div class="paypal-field-label">GCash Account</div>
                        <div class="pay-copy-value" style="font-size:0.82rem;">${this.escapeHtml(gcashNumber)} • ${this.escapeHtml(gcashHolderName)}</div>
                      </div>
                      <button type="button" class="btn btn-outline-gold btn-sm" style="padding:0.2rem 0.55rem;font-size:0.72rem;" onclick="AvioraPayments.copyText('${this.escapeHtml(gcashNumber)}', 'GCash number copied')">Copy Number</button>
                    </div>
                    <h4 style="margin:0 0 0.4rem 0;font-size:0.9rem;">Pay via GCash QR Code</h4>
                    <ol class="paypal-steps-list" style="margin-bottom:0;">
                      <li>Open your <strong>GCash</strong> app and tap <strong>QR</strong> (or save this QR image and tap <strong>Upload QR</strong>).</li>
                      <li>Scan the QR code and verify recipient name <strong>${this.escapeHtml(gcashHolderName)}</strong>.</li>
                      <li>Send the <strong>exact amount (${this.escapeHtml(exactAmountStr)})</strong> to facilitate easier confirmation and verification.</li>
                      <li>Take a screenshot of your GCash confirmation receipt and upload it below.</li>
                    </ol>
                  </div>
                </div>
              </div>
            ` : ''}

            ${hasMode ? `
              <!-- STEP 3: REQUIRED PROOF OF PAYMENT UPLOAD AT THE END OF THE PAYMENT SECTION -->
              <div class="pay-proof-footer-card" id="paypal-proof-upload-section">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.45rem;">
                  <div>
                    <div class="paypal-eyebrow" style="margin-bottom: 0.2rem;">Step 3 • Required Proof of Payment</div>
                    <h3 style="margin: 0; font-size: 1.05rem;">Upload Payment Confirmation Screenshot *</h3>
                  </div>
                  <span class="badge-gold" style="font-size: 0.7rem;">${this.escapeHtml(chosenChannelText)}</span>
                </div>

                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 0.85rem 0; line-height: 1.45;">
                  Upload a clear screenshot of your completed <strong>${this.escapeHtml(chosenAppLabel)}</strong> payment showing the <strong>exact amount (${this.escapeHtml(exactAmountStr)})</strong> to facilitate easier confirmation and verification. Bookings remain <strong>Pending Admin Review</strong> until verified.
                </p>

                <form id="paypal-proof-submit-form" onsubmit="event.preventDefault(); AvioraPayments.submitProofForm(${inv.id});">
                  <div class="paypal-readonly-amount-pill">
                    <span>Locked Exact Amount:</span>
                    <strong>${this.escapeHtml(exactAmountStr)} (${this.escapeHtml(inv.invoice_number)})</strong>
                  </div>

                  <div class="form-group" style="margin-bottom: 0.85rem;">
                    <label class="form-label" for="proof-screenshot-input">Proof of Payment Screenshot (JPG, JPEG, PNG — Max 5MB) *</label>
                    <input type="file" id="proof-screenshot-input" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style="display: none;" onchange="AvioraPayments.onProofFileSelected(this)" />
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                      <button type="button" class="btn btn-outline-gold btn-sm" id="btn-trigger-proof-upload" onclick="document.getElementById('proof-screenshot-input').click()">
                        Upload Screenshot *
                      </button>
                      <span id="proof-selected-filename" style="font-size: 0.78rem; color: var(--text-secondary);">${this.pendingProofFile ? this.escapeHtml(this.pendingProofFile.name) : 'No screenshot selected yet (required)'}</span>
                    </div>
                    <div id="proof-preview-wrap" class="paypal-proof-preview-wrap" style="display: ${this.pendingProofPreviewUrl ? 'block' : 'none'};">
                      <img id="proof-preview-img" src="${this.pendingProofPreviewUrl || ''}" alt="Proof of Payment Preview" class="paypal-proof-preview-img" />
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.45rem;">
                        <span id="proof-preview-meta" style="font-size: 0.74rem; color: var(--text-secondary);">${this.pendingProofFile ? `${this.escapeHtml(this.pendingProofFile.name)} • ${(this.pendingProofFile.size / 1024).toFixed(1)} KB` : ''}</span>
                        <button type="button" class="btn btn-secondary btn-sm" style="padding: 0.18rem 0.55rem; font-size: 0.72rem;" onclick="AvioraPayments.clearProofSelection()">Remove</button>
                      </div>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" for="paypal-ref-input">${isGcash ? 'GCash Reference No.' : 'PayPal Transaction ID'} (Optional)</label>
                      <input type="text" id="paypal-ref-input" class="form-control" maxlength="100" placeholder="${isGcash ? 'e.g. 0012345678901' : 'e.g. 8AB12345XYZ'}" value="${this.escapeHtml(this.pendingOrderIds[inv.id] || '')}" />
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" for="paypal-date-input">Payment Date</label>
                      <input type="date" id="paypal-date-input" class="form-control" value="${todayIso}" />
                    </div>
                  </div>

                  <button type="submit" id="btn-submit-paypal-proof" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 0.85rem; font-weight: 700;">
                    ${inv.status === 'not_received' ? 'Submit New Proof &amp; Retry Verification →' : 'Submit Proof of Payment for Admin Review →'}
                  </button>
                </form>
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;
  },

  finishInlineFlowToDashboard() {
    if (typeof StudentSub !== 'undefined' && StudentSub.closeEnrollmentModal) StudentSub.closeEnrollmentModal();
    if (typeof Tutors !== 'undefined' && Tutors.closeBookingModal) Tutors.closeBookingModal();
    if (typeof AvioraBuddy !== 'undefined' && AvioraBuddy.closeModal) AvioraBuddy.closeModal('modal-create-buddy-peer');
    this.closeInvoicePaymentModal();
    window.location.hash = '#student-portal';
    if (typeof Router !== 'undefined' && Router.handleRoute) Router.handleRoute();
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
      showToast(res.message || 'Proof of payment submitted! Status is Pending Admin Review.', 'success');

      try {
        const data = await API.getStudentPayments();
        this.studentInvoices = data.invoices || [];
        this.studentPayments = data.payments || [];
        this.paymentSettings = data.settings || this.paymentSettings;
      } catch (e) {}

      this.renderStudentCheckout(this.activeMountContainerId);
      if (this.inlineOnSubmitted) {
        try { await this.inlineOnSubmitted(res); } catch (e) {}
      }
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
                        ${this.escapeHtml(this.channelLabel(p.payment_channel))} • Submitted: ${this.formatDateTime(p.submitted_at)} • Pay Date: ${this.escapeHtml(p.payment_date || '—')}
                        ${p.paypal_reference_number ? ` • Ref ID: <code>${this.escapeHtml(p.paypal_reference_number)}</code>` : ''}
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
                Proceed to Payment (PayPal / GCash) →
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

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.85rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="badge-gold">Invoices: ${invoices.length}</span>
            ${pendingCount > 0 ? `<span class="paypal-status-badge paypal-status-pending">${pendingCount} Pending Admin Review</span>` : ''}
            ${unpaidOrRejected.length > 0 ? `<span class="paypal-status-badge paypal-status-rejected">${unpaidOrRejected.length} Action Needed</span>` : ''}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">PayPal: <strong>snmanalo26@gmail.com</strong> • GCash: <strong>09945586658</strong></span>
        </div>
        ${invoices.length === 0 ? `
          <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">No PayPal invoices yet. When booking a paid lesson or lesson plan, payment continues seamlessly right inside the booking flow.</p>
        ` : invoices.map(inv => {
          const st = this.statusMeta(inv.status);
          const latest = inv.latest_payment;
          const canPayOrRetry = ['unpaid', 'not_received'].includes(inv.status) && (!latest || latest.status !== 'pending');
          return `
            <div class="paypal-attempt-row">
              <div>
                <strong>${this.escapeHtml(inv.invoice_number)}</strong> — ${this.escapeHtml(inv.title)}
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                  ${this.escapeHtml(this.formatMoney(inv.amount, inv.currency_code, inv.currency_symbol))} • <span class="paypal-status-badge ${st.cls}" style="font-size: 0.68rem;">${st.label}</span>
                  ${latest ? ` • Ref: <code>${this.escapeHtml(latest.paypal_reference_number || latest.transaction_code)}</code>` : ''}
                </div>
                ${latest && latest.admin_notes ? `<div style="font-size: 0.74rem; color: var(--gold-800); margin-top: 0.2rem;"><strong>Note:</strong> ${this.escapeHtml(latest.admin_notes)}</div>` : ''}
              </div>
              <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                ${latest ? `<button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraPayments.viewProofScreenshot(${latest.id})">View Proof</button>` : ''}
                ${canPayOrRetry ? `<button type="button" class="btn btn-primary btn-sm" onclick="AvioraPayments.openInvoicePaymentModal(${inv.id})">${inv.status === 'not_received' ? 'Retry Payment →' : 'Proceed to Payment →'}</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      `;
    } catch (e) {
      container.innerHTML = `<p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">PayPal billing records will appear here after generating an invoice during checkout.</p>`;
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
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = String(val);
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(successMsg, 'success');
      } catch (e) {
        showToast(val, 'info');
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(val)).then(() => showToast(successMsg, 'success')).catch(fallbackCopy);
    } else {
      fallbackCopy();
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
      const chanText = this.channelLabel(p.payment_channel);
      const verifySummary = p.status === 'accepted'
        ? `Verified received by ${this.escapeHtml(p.verified_by_name || 'Admin')}`
        : (p.status === 'not_received'
          ? 'Not Received / Discrepancy Reported'
          : 'Awaiting Admin PayPal Funds Verification');
      return `
        <div class="paypal-admin-verify-card" id="admin-paypal-card-${p.id}">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.45rem;">
            <span style="font-size: 0.82rem; font-weight: 800; color: #F8FAFC; letter-spacing: 0.01em;">Student Payment Details</span>
            <span style="font-size: 0.74rem; color: #94A3B8;">Tx: ${this.escapeHtml(p.transaction_code)}</span>
          </div>

          <div class="paypal-admin-verify-top" style="padding-bottom: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div>
              <div style="font-size: 1.55rem; font-weight: 900; color: #F0B84A; font-family: var(--font-heading); line-height: 1.15;">${this.escapeHtml(amtStr)}</div>
              <div style="font-size: 0.82rem; color: #CBD5E1; margin-top: 0.25rem;">
                ${this.escapeHtml(p.invoice_title)} ${p.invoice_description ? '— ' + this.escapeHtml(p.invoice_description) : ''}
              </div>
            </div>
            <span class="paypal-status-badge ${st.cls}">${st.label}</span>
          </div>

          <div class="paypal-admin-kv-list">
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Student</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(p.student_name)} <span style="font-weight: 400; color: #94A3B8;">(${this.escapeHtml(p.student_email)} • ID #${p.student_id}${p.student_phone ? ' • ' + this.escapeHtml(p.student_phone) : ''})</span></strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Payment Method</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(chanText)}</strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Admin Recipient</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(p.recipient_name)} (${this.escapeHtml(p.recipient_contact)})</strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Invoice Number</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(p.invoice_number)}</strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Transaction / Ref ID</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(p.paypal_reference_number || p.paypal_order_id || 'Uploaded via Screenshot Proof')}</strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Payment &amp; Submission Date</span>
              <strong class="paypal-admin-kv-val">${this.escapeHtml(p.payment_date || '—')} • Submitted ${this.formatDateTime(p.submitted_at)}</strong>
            </div>
            <div class="paypal-admin-kv-row">
              <span class="paypal-admin-kv-key">Proof Verification Status</span>
              <span class="paypal-status-badge ${st.cls}" style="font-size: 0.72rem;">${verifySummary}</span>
            </div>
          </div>

          <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: ${p.status === 'pending' ? '0.9rem' : '0'};">
              <button type="button" class="btn btn-outline-gold btn-sm" onclick="AvioraPayments.viewProofScreenshot(${p.id})">
                View &amp; Enlarge Proof Screenshot (${this.escapeHtml(p.proof_filename)})
              </button>
              ${p.admin_notes ? `<span style="font-size: 0.78rem; color: #FDE68A;">Note: ${this.escapeHtml(p.admin_notes)}</span>` : ''}
            </div>

            ${p.status === 'pending' ? `
              <div style="padding-top: 0.85rem; border-top: 1px dashed rgba(255,255,255,0.12);">
                <div style="font-size: 0.9rem; font-weight: 800; color: #FFFFFF; margin-bottom: 0.25rem;">Admin Verification</div>
                <p style="font-size: 0.78rem; color: #CBD5E1; margin: 0 0 0.85rem 0; line-height: 1.45;">
                  Verify that exact ${String(p.payment_channel || '').startsWith('gcash') ? 'GCash' : 'PayPal'} funds of <strong>${this.escapeHtml(amtStr)}</strong> actually arrived in <strong>${this.escapeHtml(p.recipient_name)} (${this.escapeHtml(p.recipient_contact)})</strong> and match the uploaded screenshot before accepting.
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.55rem;">
                  <button type="button" class="btn" style="width: 100%; justify-content: center; background: #16A34A; color: #FFFFFF; border: none; font-weight: 700; padding: 0.7rem 1rem;" onclick="AvioraPayments.acceptAdminPaymentFlow(${p.id}, '${this.escapeHtml(amtStr)}', '${this.escapeHtml(p.invoice_number)}', '${this.escapeHtml(p.payment_channel)}', '${this.escapeHtml(p.recipient_contact)}')">
                    Accept Payment
                  </button>
                  <button type="button" class="btn" style="width: 100%; justify-content: center; background: transparent; color: #F8FAFC; border: 1px solid rgba(255,255,255,0.22); font-weight: 600; padding: 0.65rem 1rem;" onclick="AvioraPayments.rejectAdminPaymentFlow(${p.id}, '${this.escapeHtml(p.invoice_number)}', '${this.escapeHtml(p.payment_channel)}', '${this.escapeHtml(p.recipient_contact)}')">
                    Mark as Not Received / Report Discrepancy
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onclick="AvioraPayments.requestMoreInfoFlow(${p.id}, '${this.escapeHtml(p.invoice_number)}')">
                    Request Additional Verification Info
                  </button>
                </div>
              </div>
            ` : ''}
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

  acceptAdminPaymentFlow(paymentId, amtStr, invoiceNum, channel = 'paypal', recipientContact = '') {
    const isGcash = String(channel || '').startsWith('gcash');
    const appName = isGcash ? 'GCash' : 'PayPal';
    const dest = recipientContact || (isGcash ? '09945586658 (ST******E N****E M.)' : 'snmanalo26@gmail.com');
    showConfirm(
      `Confirm that actual ${appName} funds of ${amtStr} for ${invoiceNum} have been received in ${dest}? Accepting will activate the student's booking.`,
      async () => {
        try {
          const res = await API.acceptAdminPayment(paymentId, {
            admin_notes: `Funds (${amtStr}) verified received in Admin ${appName} (${dest}).`
          });
          showToast(res.message || 'Payment accepted!', 'success');
          await this.loadAdminPayments(this.adminFilter || 'all');
          if (typeof Admin !== 'undefined' && Admin.loadDashboardMetrics) Admin.loadDashboardMetrics();
        } catch (err) {
          showToast(err.message || 'Failed to accept payment.', 'error');
        }
      },
      { title: `Confirm ${appName} Funds Receipt`, confirmText: 'Accept Payment', cancelText: 'Cancel' }
    );
  },

  async rejectAdminPaymentFlow(paymentId, invoiceNum, channel = 'paypal', recipientContact = '') {
    const isGcash = String(channel || '').startsWith('gcash');
    const appName = isGcash ? 'GCash' : 'PayPal';
    const dest = recipientContact || (isGcash ? '09945586658' : 'snmanalo26@gmail.com');
    const reason = prompt(
      `Enter reason for marking Invoice ${invoiceNum} as Not Received (visible to the student):`,
      `Funds not yet reflected in ${appName} (${dest}) or screenshot unclear. Please verify exact amount and upload a new proof screenshot.`
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
      const qrPreview = document.getElementById('admin-paypal-qr-preview');
      const qrEmpty = document.getElementById('admin-paypal-qr-empty');

      if (holderInp) holderInp.value = s.paypal_holder_name || 'Stephanie Nicole Debo Manalo';
      if (contactInp) contactInp.value = s.paypal_contact || '09945586658';

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
    try {
      const res = await API.updateAdminPaymentSettings({
        paypal_holder_name: holder,
        paypal_contact: contact
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
