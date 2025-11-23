#!/bin/bash

# Simple API performance benchmark script
# Tests key endpoints and measures response times

echo "=== Ember Feed API Performance Benchmark ==="
echo

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    echo "Testing: $name"

    # First request (cold cache)
    start=$(date +%s%N)
    curl -s "$url" > /dev/null
    end=$(date +%s%N)
    cold_time=$(( (end - start) / 1000000 ))
    echo "  Cold cache: ${cold_time}ms"

    # Second request (warm cache)
    start=$(date +%s%N)
    curl -s "$url" > /dev/null
    end=$(date +%s%N)
    warm_time=$(( (end - start) / 1000000 ))
    echo "  Warm cache: ${warm_time}ms"

    # Calculate speedup
    if [ $warm_time -gt 0 ]; then
        speedup=$(( cold_time * 100 / warm_time ))
        echo "  Speedup: ${speedup}% faster"
    fi

    echo
}

# Test endpoints
test_endpoint "Articles (Personalized)" "http://localhost:3002/api/articles?limit=20&personalized=true"
test_endpoint "Recommendations" "http://localhost:3002/api/recommendations?limit=10"
test_endpoint "Daily Digest" "http://localhost:3002/api/digest"
test_endpoint "Settings" "http://localhost:3002/api/settings"

echo "=== Benchmark Complete ==="
