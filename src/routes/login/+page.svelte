<script lang="ts">
  import { User, Mail, Lock, Check } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let loginEmail = "";
  let loginPassword = "";
  let rememberMe = true;

  let regUsername = "";
  let regEmail = "";
  let regPassword = "";
  let regVerifyPassword = "";

  function handleLogin() {
    if (loginEmail) {
        // Simple mock login
        const username = loginEmail.split('@')[0]; // Use part of email as name for now
        localStorage.setItem('zensweep_user', username);
        window.location.href = "/"; // Redirect home
    }
  }

  function handleRegister() {
    if (regUsername) {
        localStorage.setItem('zensweep_user', regUsername);
        window.location.href = "/";
    }
  }
</script>

<div class="min-h-screen bg-bg text-text font-mono flex items-center justify-center p-4">
    
    <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
        
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-2 mb-2 opacity-50">
                <User size={16} />
                <span class="font-bold">register</span>
            </div>

            <div class="space-y-4">
                <input 
                    type="text" 
                    placeholder="username" 
                    bind:value={regUsername}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />
                <input 
                    type="email" 
                    placeholder="email" 
                    bind:value={regEmail}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />
                <input 
                    type="password" 
                    placeholder="password" 
                    bind:value={regPassword}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />
                <input 
                    type="password" 
                    placeholder="verify password" 
                    bind:value={regVerifyPassword}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />

                <button 
                    on:click={handleRegister}
                    class="w-full bg-sub/20 hover:bg-main hover:text-bg text-sub hover:text-bg font-bold py-3 rounded transition-colors mt-4 flex items-center justify-center gap-2"
                >
                    <User size={16} />
                    <span>sign up</span>
                </button>
            </div>
        </div>

        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-2 mb-2 opacity-50">
                <span class="font-bold">login</span>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-2">
                <button class="bg-sub/10 hover:bg-sub/20 p-3 rounded flex justify-center text-sub transition-colors">
                    <span class="font-bold text-sm">G</span>
                </button>
                <button class="bg-sub/10 hover:bg-sub/20 p-3 rounded flex justify-center text-sub transition-colors">
                    <span class="font-bold text-sm">GitHub</span>
                </button>
            </div>

            <div class="relative flex items-center justify-center my-2">
                <div class="h-[1px] bg-sub/10 w-full"></div>
                <span class="absolute bg-bg px-2 text-xs text-sub opacity-50">or</span>
            </div>

            <div class="space-y-4">
                <input 
                    type="email" 
                    placeholder="email" 
                    bind:value={loginEmail}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />
                <input 
                    type="password" 
                    placeholder="password" 
                    bind:value={loginPassword}
                    class="w-full bg-sub/10 border-none rounded p-3 text-text placeholder:text-sub/40 focus:ring-2 focus:ring-main outline-none transition-all"
                />

                <button 
                    class="flex items-center gap-2 text-xs text-sub hover:text-main transition-colors select-none w-fit"
                    on:click={() => rememberMe = !rememberMe}
                >
                    <div class="w-4 h-4 rounded bg-sub/10 flex items-center justify-center {rememberMe ? 'text-main' : 'text-transparent'}">
                        <Check size={10} strokeWidth={4} />
                    </div>
                    <span>remember me</span>
                </button>

                <button 
                    on:click={handleLogin}
                    class="w-full bg-sub/20 hover:bg-main hover:text-bg text-sub hover:text-bg font-bold py-3 rounded transition-colors mt-2 flex items-center justify-center gap-2"
                >
                    <span>sign in</span>
                </button>
                
                <div class="text-right">
                    <a href="#" class="text-xs text-sub opacity-50 hover:opacity-100 transition-opacity">forgot password?</a>
                </div>
            </div>
        </div>
    </div>
</div>
