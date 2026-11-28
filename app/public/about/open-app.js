const languageStorageKey = 'coffee-timer.language.v1'

document.querySelectorAll('[data-open-app]').forEach((link) => {
  link.addEventListener('click', () => {
    try {
      localStorage.setItem(languageStorageKey, document.documentElement.lang)
    } catch (error) {
      console.warn('Could not save language preference', error)
    }
  })
})
