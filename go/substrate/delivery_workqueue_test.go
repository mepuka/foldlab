package substrate

import (
	"fmt"
	"testing"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

func TestDeliveryEnvelope(t *testing.T) {
	harness := startJetStream(t)

	t.Run("ack timeout admits later work before redelivery", func(t *testing.T) {
		stream, consumer := createDeliveryFixture(t, harness.admin, "ASSUME_DELIVERY_TIMEOUT", "delivery.timeout", 2*time.Second)
		_ = stream
		initial := fetchExactly(t, consumer, 3, time.Second)
		assertDelivery(t, initial[0], 1, 1)
		assertDelivery(t, initial[1], 2, 1)
		assertDelivery(t, initial[2], 3, 1)
		if err := initial[1].DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack timeout witness seq 2: %v", err)
		}
		if err := initial[2].DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack timeout witness seq 3: %v", err)
		}

		fourth := nextMessage(t, consumer, time.Second)
		assertDelivery(t, fourth, 4, 1)
		redelivered := nextMessage(t, consumer, 4*time.Second)
		assertDelivery(t, redelivered, 1, 2)
		if err := redelivered.DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack redelivered seq 1: %v", err)
		}
		if err := fourth.DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack seq 4: %v", err)
		}
		t.Log("TRACE delivery timeout witness=[1/1,2/1,3/1,4/1,1/2] predicate=later-sequence-before-timeout-redelivery")
	})

	t.Run("NAK queues redelivery before later work", func(t *testing.T) {
		_, consumer := createDeliveryFixture(t, harness.admin, "ASSUME_DELIVERY_NAK", "delivery.nak", 30*time.Second)
		initial := fetchExactly(t, consumer, 3, time.Second)
		assertDelivery(t, initial[0], 1, 1)
		assertDelivery(t, initial[1], 2, 1)
		assertDelivery(t, initial[2], 3, 1)
		if err := initial[0].Nak(); err != nil {
			t.Fatalf("NAK seq 1: %v", err)
		}
		if err := initial[1].DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack NAK witness seq 2: %v", err)
		}
		if err := initial[2].DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack NAK witness seq 3: %v", err)
		}

		redelivered := nextMessage(t, consumer, 2*time.Second)
		assertDelivery(t, redelivered, 1, 2)
		if err := redelivered.DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack NAK redelivery: %v", err)
		}
		fourth := nextMessage(t, consumer, 2*time.Second)
		assertDelivery(t, fourth, 4, 1)
		if err := fourth.DoubleAck(testContext(t)); err != nil {
			t.Fatalf("ack NAK witness seq 4: %v", err)
		}
		t.Log("TRACE delivery NAK witness=[1/1,2/1,3/1,1/2,4/1] predicate=NAK-redelivery-before-undelivered-later-sequence")
	})
}

func createDeliveryFixture(
	t *testing.T,
	js jetstream.JetStream,
	streamName string,
	subject string,
	ackWait time.Duration,
) (jetstream.Stream, jetstream.Consumer) {
	t.Helper()
	stream := createStream(t, js, jetstream.StreamConfig{
		Name:              streamName,
		Subjects:          []string{subject},
		Retention:         jetstream.LimitsPolicy,
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxMsgsPerSubject: -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
	})
	for sequence := 1; sequence <= 4; sequence++ {
		ack, err := js.Publish(testContext(t), subject, []byte(fmt.Sprintf("message-%d", sequence)))
		if err != nil || ack.Sequence != uint64(sequence) {
			t.Fatalf("publish delivery message %d: ack=%+v err=%v", sequence, ack, err)
		}
	}
	consumer, err := stream.CreateConsumer(testContext(t), jetstream.ConsumerConfig{
		Name:          streamName + "_CONSUMER",
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       ackWait,
		MaxAckPending: 3,
		FilterSubject: subject,
		ReplayPolicy:  jetstream.ReplayInstantPolicy,
	})
	if err != nil {
		t.Fatalf("create delivery consumer: %v", err)
	}
	return stream, consumer
}

func fetchExactly(t *testing.T, consumer jetstream.Consumer, count int, maxWait time.Duration) []jetstream.Msg {
	t.Helper()
	batch, err := consumer.Fetch(count, jetstream.FetchMaxWait(maxWait))
	if err != nil {
		t.Fatalf("fetch %d messages: %v", count, err)
	}
	messages := make([]jetstream.Msg, 0, count)
	for message := range batch.Messages() {
		messages = append(messages, message)
	}
	if err := batch.Error(); err != nil {
		t.Fatalf("fetch %d messages batch error: %v", count, err)
	}
	if len(messages) != count {
		t.Fatalf("fetch returned %d messages, want %d", len(messages), count)
	}
	return messages
}

func nextMessage(t *testing.T, consumer jetstream.Consumer, maxWait time.Duration) jetstream.Msg {
	t.Helper()
	message, err := consumer.Next(jetstream.FetchMaxWait(maxWait))
	if err != nil {
		t.Fatalf("fetch next message: %v", err)
	}
	return message
}

func assertDelivery(t *testing.T, message jetstream.Msg, sequence, deliveries uint64) {
	t.Helper()
	metadata, err := message.Metadata()
	if err != nil {
		t.Fatalf("read delivery metadata: %v", err)
	}
	if metadata.Sequence.Stream != sequence || metadata.NumDelivered != deliveries {
		t.Fatalf(
			"delivery=%d/%d, want stream-sequence=%d num-delivered=%d",
			metadata.Sequence.Stream,
			metadata.NumDelivered,
			sequence,
			deliveries,
		)
	}
}

func TestWorkQueueShape(t *testing.T) {
	harness := startJetStream(t)
	ctx := testContext(t)
	stream := createStream(t, harness.admin, jetstream.StreamConfig{
		Name:              "ASSUME_WORK_QUEUE",
		Subjects:          []string{"work.>"},
		Retention:         jetstream.WorkQueuePolicy,
		MaxMsgs:           -1,
		MaxBytes:          -1,
		MaxMsgsPerSubject: -1,
		Storage:           jetstream.FileStorage,
		Replicas:          1,
	})
	consumer, err := stream.CreateConsumer(ctx, jetstream.ConsumerConfig{
		Name:          "WORK_A",
		AckPolicy:     jetstream.AckExplicitPolicy,
		FilterSubject: "work.a.*",
	})
	if err != nil {
		t.Fatalf("create first work-queue consumer: %v", err)
	}
	_, overlapErr := stream.CreateConsumer(ctx, jetstream.ConsumerConfig{
		Name:          "WORK_A_OVERLAP",
		AckPolicy:     jetstream.AckExplicitPolicy,
		FilterSubject: "work.a.>",
	})
	requireAPIError(t, overlapErr, 400, workQueueOverlap)
	if _, err := stream.CreateConsumer(ctx, jetstream.ConsumerConfig{
		Name:          "WORK_B",
		AckPolicy:     jetstream.AckExplicitPolicy,
		FilterSubject: "work.b.*",
	}); err != nil {
		t.Fatalf("create disjoint work-queue consumer: %v", err)
	}

	ack, err := harness.admin.Publish(ctx, "work.a.one", []byte("job"))
	if err != nil || ack.Sequence != 1 {
		t.Fatalf("publish work item: ack=%+v err=%v", ack, err)
	}
	message := nextMessage(t, consumer, time.Second)
	assertDelivery(t, message, 1, 1)
	beforeAck, err := stream.Info(ctx)
	if err != nil || beforeAck.State.Msgs != 1 {
		t.Fatalf("work queue before ack: state=%+v err=%v", beforeAck, err)
	}
	if err := message.DoubleAck(ctx); err != nil {
		t.Fatalf("confirmed first ack: %v", err)
	}

	deadline := time.Now().Add(3 * time.Second)
	for {
		info, infoErr := stream.Info(ctx)
		if infoErr != nil {
			t.Fatalf("work queue after ack: %v", infoErr)
		}
		if info.State.Msgs == 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("confirmed first ack did not remove stored message: %+v", info.State)
		}
		time.Sleep(10 * time.Millisecond)
	}
	_, getErr := stream.GetMsg(ctx, 1)
	requireAPIError(t, getErr, 404, messageNotFound)
	if second, err := consumer.Next(jetstream.FetchMaxWait(250 * time.Millisecond)); err == nil {
		metadata, _ := second.Metadata()
		t.Fatalf("second fetch recovered removed work item: %+v", metadata)
	}

	t.Log("TRACE work-queue overlap=400/10100 disjoint=accepted first-ack=removed get-seq1=404/10037 second-fetch=empty")
}
