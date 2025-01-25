import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { Product } from './types';

const exportToExcel = () => {
    const inputPath = path.join(process.cwd(), 'products.json');
    const outputPath = path.join(process.cwd(), 'products.xlsx');

    // Check if products.json exists
    if (!fs.existsSync(inputPath)) {
        console.error('products.json not found in the root directory');
        return;
    }

    try {
        // Read and parse the JSON file
        const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

        // Transform data to match desired headers
        const worksheetData = jsonData.map((product: Product) => ({
            'Product Name': product.name,
            'Type of Product': product.type || '',
            'Main Ingredient': product.mainIngredient || '',
            'Brand': product.brand || '',
            'Sale location': product.saleLocation || '',
            'On-line Reference': product.onlineReference,
            'Date visited': product.dateAccessed
        }));

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

        // Write to file
        XLSX.writeFile(workbook, outputPath);
        console.log(`Excel file created successfully at ${outputPath}`);

    } catch (error) {
        console.error('Error creating Excel file:', error);
    }
};

// Execute the script
exportToExcel();