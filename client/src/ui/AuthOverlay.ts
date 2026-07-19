/**
 * AuthOverlay — 登录/注册 DOM 浮层
 * PixiJS Canvas 上的表单用 DOM overlay 最自然
 */
import { authApi, type AuthResponse } from '../api/client.js';

let overlayEl: HTMLDivElement | null = null;

export function showAuthOverlay(onSuccess: (res: AuthResponse) => void) {
  if (overlayEl) return; // 已显示

  const div = document.createElement('div');
  div.id = 'auth-overlay';
  div.innerHTML = `
    <style>
      #auth-overlay {
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.7);
      }
      #auth-box {
        width: 320px; padding: 28px 24px;
        background: #1e1e3a; border-radius: 12px;
        border: 1px solid #4a90d9;
        color: #e0e0ff; font-family: Arial, sans-serif;
      }
      #auth-box h2 { text-align:center; margin-bottom:18px; font-size:20px; }
      #auth-box input {
        width: 100%; padding: 10px 12px; margin-bottom: 12px;
        background: #12122a; border: 1px solid #3a3a6a; border-radius: 6px;
        color: #e0e0ff; font-size: 14px; outline: none;
      }
      #auth-box input:focus { border-color: #4a90d9; }
      #auth-box .btn-row { display: flex; gap: 10px; margin-top: 6px; }
      #auth-box button {
        flex: 1; padding: 10px; border: none; border-radius: 6px;
        font-size: 14px; cursor: pointer; font-weight: bold;
      }
      #auth-box .btn-primary { background: #4a90d9; color: #fff; }
      #auth-box .btn-secondary { background: #2a2a4a; color: #aab; border: 1px solid #3a3a6a; }
      #auth-box .btn-guest { background: transparent; color: #888; font-size: 12px; margin-top: 14px; width: 100%; cursor: pointer; border: none; }
      #auth-box .error { color: #ff6b6b; font-size: 12px; margin-bottom: 8px; min-height: 16px; }
      #auth-box .switch-link { color: #4a90d9; cursor: pointer; font-size: 13px; text-align: center; margin-top: 12px; }
    </style>
    <div id="auth-box">
      <h2 id="auth-title">登录</h2>
      <div class="error" id="auth-error"></div>
      <input id="auth-username" type="text" placeholder="用户名" maxlength="24" autocomplete="username" />
      <input id="auth-password" type="password" placeholder="密码" maxlength="64" autocomplete="current-password" />
      <input id="auth-nickname" type="text" placeholder="昵称（选填）" maxlength="24" style="display:none" />
      <div class="btn-row">
        <button class="btn-primary" id="auth-submit">登录</button>
        <button class="btn-secondary" id="auth-toggle">注册</button>
      </div>
      <button class="btn-guest" id="auth-guest">跳过，游客模式</button>
    </div>
  `;
  document.body.appendChild(div);
  overlayEl = div;

  let isRegister = false;
  const title = div.querySelector('#auth-title') as HTMLHeadingElement;
  const errorEl = div.querySelector('#auth-error') as HTMLDivElement;
  const usernameInput = div.querySelector('#auth-username') as HTMLInputElement;
  const passwordInput = div.querySelector('#auth-password') as HTMLInputElement;
  const nicknameInput = div.querySelector('#auth-nickname') as HTMLInputElement;
  const submitBtn = div.querySelector('#auth-submit') as HTMLButtonElement;
  const toggleBtn = div.querySelector('#auth-toggle') as HTMLButtonElement;
  const guestBtn = div.querySelector('#auth-guest') as HTMLButtonElement;

  function toggleMode() {
    isRegister = !isRegister;
    title.textContent = isRegister ? '注册' : '登录';
    submitBtn.textContent = isRegister ? '注册' : '登录';
    toggleBtn.textContent = isRegister ? '登录' : '注册';
    nicknameInput.style.display = isRegister ? '' : 'none';
    errorEl.textContent = '';
  }

  function showError(msg: string) {
    errorEl.textContent = msg;
  }

  async function handleSubmit() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const nickname = nicknameInput.value.trim();

    if (!username || !password) { showError('请输入用户名和密码'); return; }
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
    } catch (e: any) {
      showError(e.message || '操作失败');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isRegister ? '注册' : '登录';
    }
  }

  toggleBtn.addEventListener('click', toggleMode);
  submitBtn.addEventListener('click', handleSubmit);
  passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
  guestBtn.addEventListener('click', () => { closeAuthOverlay(); onSuccess(null as any); });

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
