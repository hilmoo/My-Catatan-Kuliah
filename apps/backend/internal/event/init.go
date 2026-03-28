package event

import (
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func InitNats(natsUrl string) (jetstream.JetStream, error) {
	nc, err := nats.Connect(natsUrl)
	if err != nil {
		return nil, fmt.Errorf("Failed to connect to NATS: %v", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		return nil, fmt.Errorf("Failed to create JetStream context: %v", err)
	}

	return js, nil
}
