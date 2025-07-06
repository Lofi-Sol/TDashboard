const fs = require('fs');
const path = require('path');

// Load item details
const itemDetails = JSON.parse(fs.readFileSync(path.join(__dirname, '../itemdetails.json'), 'utf8'));

// Item categories for different batches
const ITEM_CATEGORIES = {
    high_priority: ['Drug', 'Plushie', 'Flower', 'Weapon', 'Armor'],
    medium_priority: ['Medical', 'Alcohol', 'Energy', 'Temporary'],
    low_priority: ['Other', 'Collectible', 'Special']
};

function getItemCategory(itemId) {
    if (!itemDetails.itemsById || !itemDetails.itemsById[itemId]) {
        return 'low_priority';
    }
    const itemType = itemDetails.itemsById[itemId].type || '';
    
    if (ITEM_CATEGORIES.high_priority.includes(itemType)) return 'high_priority';
    if (ITEM_CATEGORIES.medium_priority.includes(itemType)) return 'medium_priority';
    return 'low_priority';
}

// Get all items
const allItems = Object.keys(itemDetails.itemsById || {});
console.log('Total items:', allItems.length);

// Count by type
const itemTypes = {};
allItems.forEach(id => {
    const type = itemDetails.itemsById[id]?.type || 'Unknown';
    itemTypes[type] = (itemTypes[type] || 0) + 1;
});

console.log('\nItem types and counts:');
Object.entries(itemTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
});

// Batch breakdown
const highPriority = allItems.filter(id => getItemCategory(id) === 'high_priority');
const mediumPriority = allItems.filter(id => getItemCategory(id) === 'medium_priority');
const lowPriority = allItems.filter(id => getItemCategory(id) === 'low_priority');

console.log('\nBatch breakdown:');
console.log(`Morning (High Priority): ${highPriority.length} items`);
console.log(`Afternoon (Medium Priority): ${mediumPriority.length} items`);
console.log(`Evening (Low Priority): ${lowPriority.length} items`);
console.log(`Night (Full Scan): ${allItems.length} items`);

// Show some examples
console.log('\nHigh Priority Examples:');
highPriority.slice(0, 10).forEach(id => {
    const item = itemDetails.itemsById[id];
    console.log(`- ${item.name} (ID: ${id}, Type: ${item.type})`);
});

console.log('\nMedium Priority Examples:');
mediumPriority.slice(0, 10).forEach(id => {
    const item = itemDetails.itemsById[id];
    console.log(`- ${item.name} (ID: ${id}, Type: ${item.type})`);
}); 