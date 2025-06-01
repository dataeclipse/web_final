const articlesSection = document.getElementById('articles-list');
const sortSelect = document.getElementById('sort-select');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const trendingContainer = document.getElementById('trending-articles');
const searchInput = document.getElementById('search-input');
const articleModal = document.getElementById('articleModal');
const articleModalLabel = document.getElementById('articleModalLabel');
const articleModalBody = document.getElementById('articleModalBody');
const bookmarkedSection = document.getElementById('bookmarked-articles');
const backToTopBtn = document.getElementById('back-to-top');
const categoriesList = document.getElementById('categories-list');
let articles = [];
let currentSort = 'date';
let searchQuery = '';
let selectedCategory = '';
let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
let categories = [];
let fuse;
let justOpenedModal = false;
const searchSuggestions = document.getElementById('search-suggestions');

function setupFuzzySearch() {
  fuse = new window.Fuse(articles, {
    keys: ['title', 'content', 'category'],
    threshold: 0.4,
    minMatchCharLength: 2,
    includeMatches: true,
  });
}

function loadTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
  themeToggle.setAttribute('aria-pressed', theme === 'dark');
}
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeIcon.className = next === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
  themeToggle.setAttribute('aria-pressed', next === 'dark');
  localStorage.setItem('theme', next);
});
themeToggle.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    themeToggle.click();
  }
});

function fetchArticles() {
  fetch('./articles.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load articles');
      return res.json();
    })
    .then(data => {
      articles = data.articles;
      categories = getCategories(articles);
      setupFuzzySearch();
      renderCategories();
      renderMostPopular();
      renderArticles();
      renderTrending();
      renderBookmarked();
    })
    .catch(() => {
      articlesSection.innerHTML = '<div class="alert alert-danger">Failed to load articles. Make sure articles.json is in the same directory as index.html.</div>';
    });
}

function getCategories(articles) {
  const cats = new Set();
  articles.forEach(a => {
    if (a.category) cats.add(a.category);
  });
  return Array.from(cats);
}

function estimateReadingTime(wordCount) {
  return Math.ceil(wordCount / 200);
}

function filterArticles() {
  let filtered = articles;
  
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || (a.category && a.category.toLowerCase().includes(q)));
  }
  
  if (selectedCategory) {
    filtered = filtered.filter(a => a.category === selectedCategory);
  }
  
  return filtered;
}

function highlight(text, query) {
  if (!query) return text;
  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  } catch {
    return text;
  }
}

function renderArticles() {
  let sorted = [...filterArticles()];
  if (currentSort === 'date') {
    sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentSort === 'views') {
    sorted.sort((a, b) => b.views - a.views);
  }
  articlesSection.innerHTML = '';
  if (sorted.length === 0) {
    articlesSection.innerHTML = '<div class="alert alert-warning">No articles found.</div>';
    return;
  }
  sorted.forEach(article => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    col.innerHTML = `
      <div class="card article-card h-100 d-flex flex-column">
        <div class="card-header">${highlight(article.title, searchQuery)}</div>
        <div class="card-body flex-grow-1">
          <div class="card-meta mb-2 d-flex flex-wrap justify-content-between">
            <span>${new Date(article.date).toLocaleDateString()}</span>
            <span>${article.views} views</span>
            <span>${estimateReadingTime(article.wordCount)} min read</span>
            <span class="badge bg-secondary">${article.category || ''}</span>
          </div>
          <div class="card-content mb-2">${highlight(article.content.slice(0, 140), searchQuery)}${article.content.length > 140 ? '...' : ''}</div>
        </div>
        <div class="card-footer d-flex justify-content-between align-items-center">
          <button class="bookmark-btn btn btn-link p-0" data-id="${article.id}" aria-label="${bookmarks.includes(article.id) ? 'Remove bookmark' : 'Bookmark'}">
            <i class="bi ${bookmarks.includes(article.id) ? 'bi-star-fill text-warning' : 'bi-star'}"></i>
          </button>
          <button class="read-btn btn btn-primary" data-id="${article.id}" aria-label="Read full article: ${article.title}">Read Article</button>
        </div>
      </div>
    `;
    articlesSection.appendChild(col);
  });
}

function renderCategories() {
  if (!categoriesList) return;
  categoriesList.innerHTML = '';
  if (!categories.length) {
    categoriesList.innerHTML = '<li>No categories</li>';
    return;
  }
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.textContent = cat;
    li.setAttribute('tabindex', '0');
    if (selectedCategory === cat) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => {
      selectedCategory = selectedCategory === cat ? '' : cat;
      renderCategories();
      renderMostPopular();
      renderArticles();
    });
    categoriesList.appendChild(li);
  });
  
  const allLi = document.createElement('li');
  allLi.textContent = 'All Categories';
  allLi.setAttribute('tabindex', '0');
  if (!selectedCategory) {
    allLi.classList.add('active');
  }
  allLi.addEventListener('click', () => {
    selectedCategory = '';
    renderCategories();
    renderMostPopular();
    renderArticles();
  });
  categoriesList.insertBefore(allLi, categoriesList.firstChild);
}

function renderTrending() {
  if (!trendingContainer) return;
  trendingContainer.innerHTML = '';
  const trending = [...articles].sort((a, b) => b.views - a.views).slice(0, 5);
  trending.forEach(article => {
    const div = document.createElement('div');
    div.className = 'trending-item';
    div.innerHTML = `<span><i class="bi bi-fire"></i></span><span>${article.title}</span><button class="read-btn" data-id="${article.id}" aria-label="Read full article: ${article.title}"><i class="bi bi-eye"></i></button>`;
    trendingContainer.appendChild(div);
  });
}

function renderBookmarked() {
  if (!bookmarkedSection) return;
  if (!bookmarks.length) {
    bookmarkedSection.innerHTML = '<div class="bookmarked-item">No bookmarks yet.</div>';
    return;
  }
  bookmarkedSection.innerHTML = '';
  bookmarks.forEach(id => {
    const article = articles.find(a => a.id === id);
    if (!article) return;
    const div = document.createElement('div');
    div.className = 'bookmarked-item';
    div.innerHTML = `<span><i class="bi bi-bookmark"></i></span><span>${article.title}</span><button class="remove-bookmark-btn" data-id="${article.id}" aria-label="Remove bookmark"><i class="bi bi-x"></i></button><button class="read-btn" data-id="${article.id}" aria-label="Read full article: ${article.title}"><i class="bi bi-eye"></i></button>`;
    bookmarkedSection.appendChild(div);
  });
}

function renderMostPopular() {
  const section = document.getElementById('most-popular-section');
  if (!section) return;
  if (!articles.length) {
    section.innerHTML = '';
    return;
  }
  const filtered = filterArticles();
  if (!filtered.length) {
    section.innerHTML = '';
    return;
  }
  const mostPopular = [...filtered].sort((a, b) => b.views - a.views)[0];
  section.innerHTML = `
    <div class="card shadow-lg">
      <div class="card-body">
        <h5 class="card-title"><i class="bi bi-star-fill text-warning"></i> Most Popular: ${mostPopular.title}</h5>
        <div class="card-meta mb-2 d-flex flex-wrap justify-content-between">
          <span>${new Date(mostPopular.date).toLocaleDateString()}</span>
          <span>${mostPopular.views} views</span>
          <span>${estimateReadingTime(mostPopular.wordCount)} min read</span>
          <span class="badge bg-secondary">${mostPopular.category || ''}</span>
        </div>
        <div class="card-text mb-2">${mostPopular.content.slice(0, 180)}${mostPopular.content.length > 180 ? '...' : ''}</div>
        <div class="d-flex justify-content-end">
          <button class="read-btn btn btn-primary" data-id="${mostPopular.id}" aria-label="Read full article: ${mostPopular.title}">Read Article</button>
        </div>
      </div>
    </div>
  `;
}

articlesSection.addEventListener('click', e => {
  const btn = e.target.closest('.read-btn');
  if (btn) {
    const id = +btn.getAttribute('data-id');
    incrementViewsAndShowModal(id);
    return;
  }
  const bookmarkBtn = e.target.closest('.bookmark-btn');
  if (bookmarkBtn) {
    const id = +bookmarkBtn.getAttribute('data-id');
    toggleBookmark(id);
    renderMostPopular();
    renderArticles();
    renderTrending();
    renderBookmarked();
    return;
  }
});
if (bookmarkedSection) {
  bookmarkedSection.addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-bookmark-btn');
    if (removeBtn) {
      const id = +removeBtn.getAttribute('data-id');
      toggleBookmark(id);
      renderMostPopular();
      renderArticles();
      renderTrending();
      renderBookmarked();
      return;
    }
    const readBtn = e.target.closest('.read-btn');
    if (readBtn) {
      const id = +readBtn.getAttribute('data-id');
      incrementViewsAndShowModal(id);
      return;
    }
  });
}
if (trendingContainer) {
  trendingContainer.addEventListener('click', e => {
    const readBtn = e.target.closest('.read-btn');
    if (readBtn) {
      const id = +readBtn.getAttribute('data-id');
      incrementViewsAndShowModal(id);
      return;
    }
  });
}
const mostPopularSection = document.getElementById('most-popular-section');
if (mostPopularSection) {
  mostPopularSection.addEventListener('click', e => {
    const readBtn = e.target.closest('.read-btn');
    if (readBtn) {
      const id = +readBtn.getAttribute('data-id');
      incrementViewsAndShowModal(id);
      return;
    }
  });
}

articlesSection.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('article-card')) {
    const btn = e.target.querySelector('.read-btn');
    if (btn) btn.click();
  }
});

function incrementViewsAndShowModal(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;
  article.views++;
  renderMostPopular();
  renderArticles();
  renderTrending();
  renderBookmarked();
  showArticleModal(id);
}

function showArticleModal(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;
  articleModalLabel.textContent = article.title;
  articleModalBody.innerHTML = `
    <div class="mb-2">${new Date(article.date).toLocaleDateString()}</div>
    <div class="mb-2"><span>${article.views} views</span> <span>${estimateReadingTime(article.wordCount)} min read</span> <span class="category-badge">${article.category || ''}</span></div>
    <p>${article.content}</p>
  `;
  const modal = new bootstrap.Modal(articleModal);
  modal.show();
}

function toggleBookmark(id) {
  if (bookmarks.includes(id)) {
    bookmarks = bookmarks.filter(bid => bid !== id);
  } else {
    bookmarks.push(id);
  }
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

searchInput.addEventListener('input', e => {
  searchQuery = searchInput.value;
  renderMostPopular();
  renderArticles();
  showSearchSuggestions(searchQuery);
});

function showSearchSuggestions(query) {
  if (!query.trim()) {
    searchSuggestions.style.display = 'none';
    searchSuggestions.innerHTML = '';
    return;
  }
  const results = fuse.search(query).slice(0, 5);
  if (results.length === 0) {
    searchSuggestions.style.display = 'none';
    searchSuggestions.innerHTML = '';
    return;
  }
  searchSuggestions.innerHTML = results.map(r => `<button type="button" data-id="${r.item.id}">${highlight(r.item.title, query)}</button>`).join('');
  searchSuggestions.style.display = 'block';
}
searchSuggestions.addEventListener('click', e => {
  const btn = e.target.closest('button[data-id]');
  if (btn) {
    const id = +btn.getAttribute('data-id');
    incrementViewsAndShowModal(id);
    searchSuggestions.style.display = 'none';
    searchInput.value = '';
    searchQuery = '';
    renderMostPopular();
    renderArticles();
  }
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderMostPopular();
  renderArticles();
});

window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  fetchArticles();
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 200) {
    backToTopBtn.style.display = 'flex';
  } else {
    backToTopBtn.style.display = 'none';
  }
});
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const readerToggle = document.getElementById('reader-toggle');
readerToggle.addEventListener('click', () => {
  document.body.classList.toggle('reader-mode');
});