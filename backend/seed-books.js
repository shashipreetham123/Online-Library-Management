require("./config/env");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

async function seedBooks() {
    const jsonPath = path.resolve(__dirname, "./books.json");

    if (!fs.existsSync(jsonPath)) {
        console.error(`Error: books.json not found.`);
        process.exit(1);
    }

    console.log("Reading books.json...");
    const rawData = fs.readFileSync(jsonPath, "utf-8");
    const books = JSON.parse(rawData);

    if (!Array.isArray(books) || books.length === 0) {
        console.error("Error: books.json does not contain a valid array of books.");
        process.exit(1);
    }

    console.log(`Found ${books.length} books to import.`);

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        const booksCollection = db.collection("Books");

        // Useful indexes for search and lookup performance
        await booksCollection.createIndex({ isbn: 1 }, { unique: false });
        try {
            await booksCollection.dropIndex("title_text_author_text");
        } catch (ignored) {
            // Index doesn't exist yet or already dropped
        }
        await booksCollection.createIndex(
            { title: "text", author: "text" },
            { default_language: "english", language_override: "none" }
        );
        await booksCollection.createIndex({ category: 1 });
        await booksCollection.createIndex({ rating: -1 });

        const CHUNK_SIZE = 1000;
        let insertedCount = 0;

        for (let i = 0; i < books.length; i += CHUNK_SIZE) {
            const chunk = books.slice(i, i + CHUNK_SIZE);
            const result = await booksCollection.insertMany(chunk, { ordered: false });
            insertedCount += result.insertedCount;
            console.log(`Inserted batch: ${insertedCount}/${books.length} books...`);
        }

        console.log(`✓ Successfully imported ${insertedCount} books into "${process.env.DB_NAME}.Books"!`);
    } catch (error) {
        console.error("Error inserting books:", error.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

seedBooks();
