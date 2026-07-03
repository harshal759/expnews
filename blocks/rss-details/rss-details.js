import { readBlockConfig } from '../../scripts/aem.js';
import { parseRSS } from '../../scripts/utils.js';

export default async function decorate(block) {
  const cfg = readBlockConfig(block) || {};
  const backText = cfg['back-link-text'] || '← Back to News';
  const backUrl = cfg['back-link-url'] || '/news';
  
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  if (!articleId) {
    block.innerHTML = '<p class="rss-detail-error">No article selected.</p>';
    return;
  }

  block.innerHTML = '<p class="rss-detail-loading">Loading article...</p>';
  let article = null;

  const cachedData = localStorage.getItem('rss_feed_cache');
  if (cachedData) {
    const items = JSON.parse(cachedData);
    article = items.find(item => item.id === articleId);
  }

  if (!article) {
    try {
      const response = await fetch('https://www.theguardian.com/uk/business/rss');
      if (response.ok) {
        const xmlText = await response.text();
        const freshItems = parseRSS(xmlText);
        article = freshItems.find(item => item.id === articleId);
      }
    } catch (e) {
      console.error('Fallback fetch failed', e);
    }
  }

  block.innerHTML = '';

  if (article) {
    const dateText = article.pubDate ? new Date(article.pubDate).toLocaleString() : '';
    
    block.innerHTML = `
      <div class="rss-detail-wrapper">
        <div class="rss-detail-nav">
          <a href="${backUrl}">${backText}</a>
        </div>
        
        <div class="rss-detail-image">
          ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ''}
        </div>
        
        <div class="rss-detail-content">
          <p class="rss-detail-date">${dateText}</p>
          <h1 class="rss-detail-title">${article.title}</h1>
          ${article.creator ? `<p class="rss-detail-author">By ${article.creator}</p>` : ''}
          <div class="rss-detail-body">
            ${article.description}
          </div>
          <div class="rss-detail-action">
             <a href="${article.guid}" target="_blank" rel="noopener noreferrer" class="rss-detail-btn">Read Original</a>
          </div>
        </div>
      </div>
    `;
  } else {
    block.innerHTML = '<p class="rss-detail-error">Article not found or expired.</p>';
  }
}