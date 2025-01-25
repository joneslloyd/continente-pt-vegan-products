import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

interface Product {
  name: string;
  type: string | null;
  mainIngredient: string | null;
  brand: string | null;
  saleLocation: string | null;
  onlineReference: string;
  dateAccessed: string;
}

const translateToEnglish = (portugueseText: string): string => {
  const translations: { [key: string]: string } = {
    'Congelado': 'Frozen',
    'Vegetal': 'Vegetable',
    'Proteína Vegetal': 'Plant Protein',
    'Vegan': 'Vegan',
    'Hambúrgueres': 'Burgers',
    'Almôndegas': 'Meatballs'
    // Add more translations as needed
  };

  return translations[portugueseText] || portugueseText;
};

const scrapeProducts = async () => {
  const baseUrl = 'https://www.continente.pt/on/demandware.store/Sites-continente-Site/default/Search-UpdateGrid';
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

        // Fetch the page with headers
      const response = await axios.get(baseUrl, {
        params,
        headers,
      });

      // Wrap the fragment in a root element to help Cheerio parse it properly
      const wrappedHtml = `<div id="root">${response.data}</div>`;
      const $ = cheerio.load(wrappedHtml, {
        xml: {
          xmlMode: false,
          decodeEntities: true
        },
        // Ignore script tags to avoid parsing issues
        scriptingEnabled: false
      });

      // Update selector to account for the wrapped structure
      const products = $('#root .product');
      if (products.length === 0) {
        hasMoreProducts = false;
        break;
      }

      products.each((_index, product) => {
        const productElement = $(product);

        const name = productElement.find('.pwc-tile--description').text().trim();
        const typePort = productElement.find('.ct-product-tile-badge--general img').attr('title') || null;
        const type = typePort ? translateToEnglish(typePort) : null;
        const brand = productElement.find('.pwc-tile--brand').text().trim() || null;
        const saleLocation = 'Continent'; // Assumed based on the website
        const onlineReference = productElement.find('.ct-pdp-link a').attr('href') || '';
        const dateAccessed = new Date().toISOString();

        // Attempt to infer the main ingredient if not directly available
        const mainIngredientPort = name.match(/vegan|vegetal|tofu|seitan|soja|lentilha/i)?.[0] || null;
        const mainIngredient = mainIngredientPort ? translateToEnglish(mainIngredientPort) : null;

        allProducts.push({
          name,
          type,
          mainIngredient,
          brand,
          saleLocation,
          onlineReference,
          dateAccessed
        });
      });

      // Increment the "start" param to fetch the next page
      params.start += 36;
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

// Execute the script
scrapeProducts().then((products) => {
  console.log('Scraped products:', products);
}).catch((error) => {
  console.error('Failed to scrape products:', error);
});