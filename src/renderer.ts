declare const Vue: {
  createApp: (options: {
    data(): { message: string }
    template: string
  }) => { mount(selector: string): void }
}

const { createApp } = Vue

createApp({
  data() {
    return {
      message: 'Electron + Vue is running.'
    }
  },
  template: `
    <main class="shell">
      <section class="card">
        <h1>{{ message }}</h1>
        <p>The main process, page loading, and Vue mount flow are all connected now.</p>
      </section>
    </main>
  `
}).mount('#app')