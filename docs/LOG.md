
ℹ Error: bookId is not defined

 ⁃ (D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)

   69 ┃    name: string;
   70 ┃    time: string;
   71 ┃    rating: number;
   72 ┃    text: string;
   73 ┃    likes: number;
 ❯ 74 ┃    replies: string[];
   75 ┃  }
   76 ┃
   77 ┃  const reviews = ref<Review[]>([
   78 ┃    { id: 1, initials: 'AM', name: 'Aris M.', time: '14m ago', rating: 5, text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.', likes: 12, replies: ['That was the passage that stayed with me too. — Mina K.'] },
   79 ┃    { id: 2, initials: 'LW', name: 'Leo Wang', time: '2h ago', rating: 4, text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.', likes: 8, replies: [] },

 ⁃ at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)
 ⁃ at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)
 ⁃ (async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)
 ⁃ at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)
 ⁃ at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:3)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)

[CAUSE]
ReferenceError {
  stack: 'bookId is not defined\n' +
  'at D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)\n' +
  'at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)\n' +
  'at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)\n' +
  'at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)\n' +
  'at async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)\n' +
  'at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)\n' +
  'at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/'... 158 more characters,
  message: 'bookId is not defined',
}
[9:37:08 AM]  ERROR  [request error] [unhandled] [GET] http://localhost:3000/__nuxt_error?error=true&url=%2F&statusCode=500&statusMessage=Server+Error&message=bookId+is+not+defined&stack=bookId+is+not+defined%0Aat+D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fpages%2Fbook%2F%5Bid%5D.vue:74:20)%0Aat+ViteNodeRunner.runModule+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:369:44)%0Aat+ViteNodeRunner.directRequest+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:349:14)%0Aat+process.processTicksAndRejections+(node:internal%2Fprocess%2Ftask_queues:105:5)%0Aat+async+ViteNodeRunner.cachedRequest+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:182:11)%0Aat+async+ViteNodeRunner.dependencyRequest+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:229:10)%0Aat+async+D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fvirtual:nuxt:D%253A%252FGithub%252Fread-in-pace%252Ffrontend%252F.nuxt%252Froutes.mjs:6:31)%0Aat+async+ViteNodeRunner.runModule+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:369:4)%0Aat+async+ViteNodeRunner.directRequest+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:349:3)%0Aat+async+ViteNodeRunner.cachedRequest+(D:%2FGithub%2Fread-in-pace%2Ffrontend%2Fnode_modules%2Fvite-node%2Fdist%2Fclient-C7yCjfvf.mjs:182:11)


ℹ Error: bookId is not defined

 ⁃ (D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)

   69 ┃    name: string;
   70 ┃    time: string;
   71 ┃    rating: number;
   72 ┃    text: string;
   73 ┃    likes: number;
 ❯ 74 ┃    replies: string[];
   75 ┃  }
   76 ┃
   77 ┃  const reviews = ref<Review[]>([
   78 ┃    { id: 1, initials: 'AM', name: 'Aris M.', time: '14m ago', rating: 5, text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.', likes: 12, replies: ['That was the passage that stayed with me too. — Mina K.'] },
   79 ┃    { id: 2, initials: 'LW', name: 'Leo Wang', time: '2h ago', rating: 4, text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.', likes: 8, replies: [] },

 ⁃ at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)
 ⁃ at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)
 ⁃ (async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)
 ⁃ at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)
 ⁃ at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:3)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)

[CAUSE]
ReferenceError {
  stack: 'bookId is not defined\n' +
  'at D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)\n' +
  'at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)\n' +
  'at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)\n' +
  'at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)\n' +
  'at async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)\n' +
  'at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)\n' +
  'at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/'... 158 more characters,
  message: 'bookId is not defined',
}
[9:37:08 AM]  ERROR  [request error] [unhandled] [GET] http://localhost:3000/


ℹ Error: bookId is not defined

 ⁃ (D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)

   69 ┃    name: string;
   70 ┃    time: string;
   71 ┃    rating: number;
   72 ┃    text: string;
   73 ┃    likes: number;
 ❯ 74 ┃    replies: string[];
   75 ┃  }
   76 ┃
   77 ┃  const reviews = ref<Review[]>([
   78 ┃    { id: 1, initials: 'AM', name: 'Aris M.', time: '14m ago', rating: 5, text: 'The chapter on brutalist memorials is devastating. I kept returning to its idea that a building can remember on our behalf.', likes: 12, replies: ['That was the passage that stayed with me too. — Mina K.'] },
   79 ┃    { id: 2, initials: 'LW', name: 'Leo Wang', time: '2h ago', rating: 4, text: 'Measured, elegant, and full of unexpected connections. The middle essays wander, but the final one brings everything home.', likes: 8, replies: [] },

 ⁃ at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)
 ⁃ at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)
 ⁃ (async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)
 ⁃ at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)
 ⁃ at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:3)
 ⁃ at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)

[CAUSE]
ReferenceError {
  stack: 'bookId is not defined\n' +
  'at D:/Github/read-in-pace/frontend/pages/book/[id].vue:74:20)\n' +
  'at ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:44)\n' +
  'at ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:349:14)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.cachedRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:182:11)\n' +
  'at async ViteNodeRunner.dependencyRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:229:10)\n' +
  'at async D:/Github/read-in-pace/frontend/virtual:nuxt:D%3A%2FGithub%2Fread-in-pace%2Ffrontend%2F.nuxt%2Froutes.mjs:6:31)\n' +
  'at async ViteNodeRunner.runModule (D:/Github/read-in-pace/frontend/node_modules/vite-node/dist/client-C7yCjfvf.mjs:369:4)\n' +
  'at async ViteNodeRunner.directRequest (D:/Github/read-in-pace/frontend/node_modules/vite-node/'... 158 more characters,
  message: 'bookId is not defined',
}