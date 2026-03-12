package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ─────────────────────────────────────
//  Structs
// ─────────────────────────────────────

type Item struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Type        string             `bson:"type" json:"type"`               // "lost" or "found"
	Title       string             `bson:"title" json:"title"`             // item name
	Description string             `bson:"description" json:"description"` // details
	Category    string             `bson:"category" json:"category"`       // bag, phone, keys etc
	Location    string             `bson:"location" json:"location"`       // where lost/found
	Contact     string             `bson:"contact" json:"contact"`         // contact info
	Status      string             `bson:"status" json:"status"`           // "active" or "resolved"
	ImageURL    string             `bson:"imageUrl" json:"imageUrl"`       // image path
	Date        string             `bson:"date" json:"date"`               // date lost/found
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

// ─────────────────────────────────────
// Global variables
// ─────────────────────────────────────
var itemsCollection *mongo.Collection

// ─────────────────────────────────────
//  Main
// ─────────────────────────────────────
func main() {
	godotenv.Load()
	connectDB()

	r := gin.Default()

	// Serve uploaded images
	r.Static("/uploads", "./uploads")

	// CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Routes
	r.POST("/items", createItemHandler)           // create new item
	r.GET("/items", getItemsHandler)              // get all items
	r.GET("/items/:id", getItemHandler)           // get single item
	r.PUT("/items/:id/resolve", resolveItemHandler) // mark as resolved
	r.DELETE("/items/:id", deleteItemHandler)     // delete item

	fmt.Println("🚀 UniFind server running on http://localhost:3001")
	r.Run(":3001")
}

// ─────────────────────────────────────
//  Connect to MongoDB
// ─────────────────────────────────────
func connectDB() {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		panic("MongoDB not reachable!")
	}

	// Create uploads folder
	os.MkdirAll("./uploads", os.ModePerm)

	itemsCollection = client.Database("unifind").Collection("items")
	fmt.Println("✅ Connected to MongoDB!")
}

// ─────────────────────────────────────
//  Route Handlers
// ─────────────────────────────────────

// POST /items — create a new lost/found item
func createItemHandler(c *gin.Context) {
	// Handle image upload
	imageURL := ""
	file, err := c.FormFile("image")
	if err == nil {
		// Save image to uploads folder
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
		filePath := "./uploads/" + filename
		if err := c.SaveUploadedFile(file, filePath); err == nil {
			imageURL = "/uploads/" + filename
		}
	}

	item := Item{
		ID:          primitive.NewObjectID(),
		Type:        c.PostForm("type"),
		Title:       c.PostForm("title"),
		Description: c.PostForm("description"),
		Category:    c.PostForm("category"),
		Location:    c.PostForm("location"),
		Contact:     c.PostForm("contact"),
		Date:        c.PostForm("date"),
		Status:      "active",
		ImageURL:    imageURL,
		CreatedAt:   time.Now(),
	}

	_, err = itemsCollection.InsertOne(context.Background(), item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create item"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// GET /items — get all items with optional filters
func getItemsHandler(c *gin.Context) {
	filter := bson.M{}

	// Filter by type (lost/found)
	if itemType := c.Query("type"); itemType != "" {
		filter["type"] = itemType
	}

	// Filter by category
	if category := c.Query("category"); category != "" {
		filter["category"] = category
	}

	// Filter by status
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	cursor, err := itemsCollection.Find(context.Background(), filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch items"})
		return
	}
	defer cursor.Close(context.Background())

	var items []Item
	cursor.All(context.Background(), &items)

	if items == nil {
		items = []Item{}
	}

	c.JSON(http.StatusOK, items)
}

// GET /items/:id — get a single item
func getItemHandler(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var item Item
	err = itemsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&item)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// PUT /items/:id/resolve — mark item as resolved
func resolveItemHandler(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	_, err = itemsCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"status": "resolved"}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "✅ Item marked as resolved!"})
}

// DELETE /items/:id — delete an item
func deleteItemHandler(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	itemsCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}