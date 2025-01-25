import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { Product } from './types';

const inferCookingMethods = (product: Product): string => {
    const lowerName = product.name.toLowerCase();
    const lowerType = (product.type || '').toLowerCase();
    const lowerDesc = (product.description || '').toLowerCase();

    const methods: string[] = [];

    if (lowerType.includes('frozen') || lowerName.includes('congelado')) {
        methods.push('Defrost before cooking');
    }

    if (lowerName.includes('burger') || lowerType.includes('burger')) {
        methods.push('Pan fry or grill');
    }

    if (lowerName.includes('ball') || lowerName.includes('almôndega')) {
        methods.push('Pan fry or bake');
    }

    if (lowerDesc.includes('forno') || lowerDesc.includes('oven')) {
        methods.push('Oven bake');
    }

    return methods.length ? methods.join(', ') : 'No specific cooking method suggested';
};

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

        // Create workbook and worksheets
        const workbook = XLSX.utils.book_new();

        // First sheet - original format
        const mainSheetData = jsonData.map((product: Product) => ({
            'Product Name': product.name,
            'Type of Product': product.type || '',
            'Main Ingredient': product.mainIngredient || '',
            'Brand': product.brand || '',
            'Sale location': product.saleLocation || '',
            'On-line Reference': product.onlineReference,
            'Date visited': product.dateAccessed
        }));

        // Second sheet - cooking methods
        const cookingSheetData = jsonData.map((product: Product) => ({
            'Name of product': product.name,
            'Suggested cooking method(s)': inferCookingMethods(product),
            'URL': product.onlineReference
        }));

        const worksheet1 = XLSX.utils.json_to_sheet(mainSheetData);
        const worksheet2 = XLSX.utils.json_to_sheet(cookingSheetData);

        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet1, 'Products');
        XLSX.utils.book_append_sheet(workbook, worksheet2, 'Cooking Methods');

        // Write to file
        XLSX.writeFile(workbook, outputPath);
        console.log(`Excel file created successfully at ${outputPath}`);

    } catch (error) {
        console.error('Error creating Excel file:', error);
    }
};

// Execute the script
exportToExcel();