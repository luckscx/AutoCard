/**
 * AuthOverlay — 登录/注册 DOM 浮层
 * 玻璃拟态设计，深色渐变背景 + 精致排版
 */
import { authApi, getGitHubLoginUrl, getWechatLoginUrl, type AuthResponse } from '../api/client.js';

let overlayEl: HTMLDivElement | null = null;

export function showAuthOverlay(onSuccess: (res: AuthResponse | null) => void, initialError = '') {
  if (overlayEl) return; // 已显示

  const div = document.createElement('div');
  div.id = 'auth-overlay';
  div.innerHTML = `
    <style>
      @keyframes auth-in {
        0% { opacity: 0; transform: translateY(20px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes glow-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      @keyframes input-focus {
        0% { box-shadow: 0 0 0 0 rgba(74, 158, 255, 0); }
        100% { box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.35); }
      }
      #auth-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at 50% 30%, rgba(30, 30, 80, 0.75), rgba(5, 5, 16, 0.92));
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      #auth-box {
        width: 340px; padding: 32px 28px;
        background: linear-gradient(160deg, rgba(36, 36, 80, 0.95), rgba(16, 16, 38, 0.98));
        border-radius: 20px;
        border: 1px solid rgba(74, 158, 255, 0.25);
        color: #e8e8f5; font-family: 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.08);
        animation: auth-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .auth-logo {
        width: 56px; height: 56px; margin: 0 auto 16px;
        border-radius: 16px;
        background: linear-gradient(135deg, #4a9eff, #8b5cf6);
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; font-weight: 900; color: white;
        box-shadow: 0 4px 20px rgba(74, 158, 255, 0.4);
      }
      #auth-box h2 {
        text-align: center; margin-bottom: 6px; font-size: 22px; font-weight: 700;
        background: linear-gradient(90deg, #e8e8f5, #7bb3ff);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .auth-subtitle {
        text-align: center; font-size: 12px; color: #555575; margin-bottom: 22px;
      }
      #auth-box input {
        width: 100%; padding: 12px 14px; margin-bottom: 10px;
        background: rgba(8, 8, 26, 0.7);
        border: 1px solid rgba(72, 72, 120, 0.5); border-radius: 10px;
        color: #e8e8f5; font-size: 15px; outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
      }
      #auth-box input::placeholder { color: #44446a; }
      #auth-box input:focus {
        border-color: #4a9eff;
        background: rgba(8, 8, 26, 0.9);
        animation: input-focus 0.3s forwards;
      }
      #auth-box .btn-row { display: flex; gap: 10px; margin-top: 8px; }
      #auth-box button {
        flex: 1; padding: 12px; border: none; border-radius: 10px;
        font-size: 15px; cursor: pointer; font-weight: 700;
        font-family: inherit;
        transition: transform 0.12s, opacity 0.12s;
      }
      #auth-box button:active { transform: scale(0.96); }
      #auth-box button:disabled { opacity: 0.5; cursor: wait; }
      .btn-primary {
        background: linear-gradient(180deg, #4a9eff, #2563eb) !important; color: #fff;
        box-shadow: 0 2px 12px rgba(74, 158, 255, 0.3);
      }
      .btn-secondary {
        background: rgba(60, 60, 96, 0.5) !important; color: #8a8ab5;
        border: 1px solid rgba(72, 72, 120, 0.4);
      }
      .btn-guest {
        background: transparent; color: #555575; font-size: 12px; margin-top: 16px;
        width: 100%; cursor: pointer; border: none; padding: 8px;
        font-family: inherit;
      }
      .btn-guest:hover { color: #8a8ab5; }
      .error { color: #ff5b5b; font-size: 12px; margin-bottom: 6px; min-height: 16px; text-align: center; }
      .oauth-divider { display: flex; align-items: center; gap: 10px; color: #44446a; font-size: 11px; margin: 20px 0 12px; }
      .oauth-divider::before, .oauth-divider::after { content: ''; height: 1px; flex: 1; background: rgba(72, 72, 120, 0.4); }
      .oauth-row { display: flex; gap: 10px; }
      .oauth {
        color: #fff; text-decoration: none; text-align: center; padding: 10px 6px;
        border-radius: 10px; flex: 1; font: bold 13px 'Noto Sans CJK SC', 'PingFang SC', Arial, sans-serif;
        transition: transform 0.12s; cursor: pointer;
      }
      .oauth:active { transform: scale(0.96); }
      .oauth.github { background: linear-gradient(180deg, #2d333b, #1c2128); }
      .oauth.wechat { background: linear-gradient(180deg, #07c160, #058547); }
    </style>
    <div id="auth-box">
      <div class="auth-logo">🃏</div>
      <h2 id="auth-title">登录</h2>
      <div class="auth-subtitle">自走牌 · 异世界冒险</div>
      <div class="error" id="auth-error"></div>
      <input id="auth-username" type="text" placeholder="用户名" maxlength="24" autocomplete="username" />
      <input id="auth-password" type="password" placeholder="密码" maxlength="64" autocomplete="current-password" />
      <input id="auth-nickname" type="text" placeholder="昵称（选填）" maxlength="24" style="display:none" />
      <div class="btn-row">
        <button class="btn-primary" id="auth-submit">登录</button>
        <button class="btn-secondary" id="auth-toggle">注册</button>
      </div>
      <div class="oauth-divider">第三方登录</div>
      <div class="oauth-row">
        <a class="oauth github" id="auth-github">GitHub</a>
        <a class="oauth wechat" id="auth-wechat">微信</a>
      </div>
      <button class="btn-guest" id="auth-guest">跳过，游客模式</button>
    </div>
  `;
  document.body.appendChild(div);
  overlayEl = div;

  let isRegister = false;
  const title = div.querySelector('#auth-title') as HTMLHeadingElement;
  const subtitle = div.querySelector('.auth-subtitle') as HTMLDivElement;
  const errorEl = div.querySelector('#auth-error') as HTMLDivElement;
  const usernameInput = div.querySelector('#auth-username') as HTMLInputElement;
  const passwordInput = div.querySelector('#auth-password') as HTMLInputElement;
  const nicknameInput = div.querySelector('#auth-nickname') as HTMLInputElement;
  const submitBtn = div.querySelector('#auth-submit') as HTMLButtonElement;
  const toggleBtn = div.querySelector('#auth-toggle') as HTMLButtonElement;
  const guestBtn = div.querySelector('#auth-guest') as HTMLButtonElement;
  (div.querySelector('#auth-github') as HTMLAnchorElement).href = getGitHubLoginUrl();
  (div.querySelector('#auth-wechat') as HTMLAnchorElement).href = getWechatLoginUrl();
  errorEl.textContent = initialError;

  function toggleMode() {
    isRegister = !isRegister;
    title.textContent = isRegister ? '注册' : '登录';
    subtitle.textContent = isRegister ? '创建新冒险者账户' : '自走牌 · 异世界冒险';
    submitBtn.textContent = isRegister ? '注册' : '登录';
    toggleBtn.textContent = isRegister ? '已有账号？登录' : '注册';
    nicknameInput.style.display = isRegister ? '' : 'none';
    errorEl.textContent = '';
  }

  function showError(msg: string) {
    errorEl.textContent = msg;
  }

  async function handleSubmit() {
    if (submitBtn.disabled) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const nickname = nicknameInput.value.trim();

    if (!username || !password) { showError('请输入用户名和密码'); return; }
    if (isRegister && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      showError('用户名须为3-24位字母、数字或下划线');
      return;
    }
    if (isRegister && password.length < 6) { showError('密码至少6位'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const res = isRegister
        ? await authApi.register(username, password, nickname || undefined)
        : await authApi.login(username, password);
      authApi.saveLogin(res);
      closeAuthOverlay();
      onSuccess(res);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : '操作失败');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isRegister ? '注册' : '登录';
    }
  }

  toggleBtn.addEventListener('click', toggleMode);
  submitBtn.addEventListener('click', handleSubmit);
  [usernameInput, passwordInput, nicknameInput].forEach(input => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void handleSubmit(); });
  });
  guestBtn.addEventListener('click', () => {
    authApi.continueAsGuest();
    closeAuthOverlay();
    onSuccess(null);
  });

  usernameInput.focus();
}

export function closeAuthOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export function isAuthOverlayVisible() {
  return !!overlayEl;
}
