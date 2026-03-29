package event

import (
	"context"
	"log"

	"github.com/nats-io/nats.go/jetstream"
)

func InitEmbedderStream(ctx context.Context, js jetstream.JetStream) {
	cfg := jetstream.StreamConfig{
		Name:              "EMBEDDER_NEW_CONTENT",
		Subjects:          []string{"embedder.v1.newcontent.>"},
		Retention:         jetstream.WorkQueuePolicy,
		MaxMsgsPerSubject: 1,
		Discard:           jetstream.DiscardNew,
		Storage:           jetstream.FileStorage,
	}

	_, err := js.CreateOrUpdateStream(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to create embedder stream: %v", err)
	}
}
