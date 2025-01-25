import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { Product } from './types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const translateToEnglish = (portugueseText: string): string => {
  const translations: { [key: string]: string } = {
    'Congelado': 'Frozen',
    'Vegetal': 'Vegetable',
    'Proteína Vegetal': 'Plant Protein',
    'Vegan': 'Vegan',
    'Hambúrgueres': 'Burgers',
    'Almôndegas': 'Meatballs',
    'Biológico': 'Organic'
  };

  return translations[portugueseText] || portugueseText;
};

const fetchProductDescription = async (url: string, headers: any): Promise<string | null> => {
  try {
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    // Find all description sections
    const details: string[] = [];

    // Look for elements with ct-pdp-- prefix classes that contain description text
    $('[class^="ct-pdp--"]').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && !text.includes('Aviso Legal:')) {  // Exclude legal disclaimer
        details.push(text);
      }
    });

    return details.length > 0 ? details.join('\n') : null;
  } catch (error) {
    console.error(`Error fetching description for ${url}:`, error);
    return null;
  }
};

const scrapeProducts = async (limit?: number) => {
  const baseUrl = 'https://www.continente.pt';
  const searchUrl = `${baseUrl}/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid`;
  const params = {
    cgid: 'bio-vegetariano-vegan-alternativas-carne-peixe',
    pmin: '0.01',
    srule: 'FOOD-BIO',
    start: 0,
    sz: 36
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.continente.pt/',
    'Connection': 'keep-alive',
  };

  const allProducts: Product[] = [];
  let hasMoreProducts = true;

  while (hasMoreProducts) {
    try {
      const response = await axios.get(searchUrl, {
        params,
        headers,
      });

      const wrappedHtml = `<div id="root">${response.data}</div>`;
      const $ = cheerio.load(wrappedHtml);

      const products = $('#root .product');
      if (products.length === 0) {
        hasMoreProducts = false;
        break;
      }

      for (const product of products.toArray()) {
        // Check if we've reached the limit
        if (limit && allProducts.length >= limit) {
          hasMoreProducts = false;
          break;
        }

        const productElement = $(product);
        const onlineReference = productElement.find('.ct-pdp-link a').attr('href') || '';

        // Basic product info
        const name = productElement.find('.pwc-tile--description').text().trim();
        const typePort = productElement.find('.ct-product-tile-badge--general img').attr('title') || null;
        const type = typePort ? translateToEnglish(typePort) : null;
        const brand = productElement.find('.pwc-tile--brand').text().trim() || null;
        const saleLocation = 'Continent';
        const dateAccessed = new Date().toISOString();

        // Fetch full description from product page
        let description = null;
        if (onlineReference) {
          const fullUrl = onlineReference.startsWith('http') ? onlineReference : `${baseUrl}${onlineReference}`;
          description = await fetchProductDescription(fullUrl, headers);
          console.log(`Fetched description for ${name}`);
          // Add a small delay to avoid overwhelming the server
          await sleep(1000);
        }

        const mainIngredientPort = name.match(/vegan|vegetal|tofu|seitan|soja|lentilha/i)?.[0] || null;
        const mainIngredient = mainIngredientPort ? translateToEnglish(mainIngredientPort) : null;

        allProducts.push({
          name,
          type,
          mainIngredient,
          brand,
          saleLocation,
          onlineReference,
          dateAccessed,
          description
        });

        console.log(`Added product: ${name}`);
      }

      if (!hasMoreProducts) break;

      params.start += 36;
      console.log(`Processed ${allProducts.length} products so far...`);

      // Add a small delay between pages
      await sleep(2000);

    } catch (error) {
      console.error('Error fetching or parsing the data:', error);
      break;
    }
  }

  // Save to JSON file
  const filePath = './products.json';
  try {
    fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 2));
    console.log(`Scraped data saved to ${filePath}`);
  } catch (err) {
    console.error('Error saving to file:', err);
  }

  return allProducts;
};

// Execute the script with optional limit
const limit = process.argv[2] ? parseInt(process.argv[2]) : undefined;
scrapeProducts(limit).then((products) => {
  console.log(`Successfully scraped ${products.length} products`);
}).catch((error) => {
  console.error('Failed to scrape products:', error);
});