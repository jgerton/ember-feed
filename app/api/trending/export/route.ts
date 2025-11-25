/**
 * Export Trending Topics
 *
 * Export trending topics to CSV or JSON format
 * GET /api/trending/export?type=hot&timeframe=24hr&format=csv
 * GET /api/trending/export?type=trending-up&timeframe=7day&format=json
 */

import { NextRequest, NextResponse } from 'next/server';

const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'http://aggregator:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'hot'; // 'hot' or 'trending-up'
    const timeframe = searchParams.get('timeframe') || '24hr';
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Validate parameters
    if (type !== 'hot' && type !== 'trending-up') {
      return NextResponse.json(
        { error: 'type must be "hot" or "trending-up"' },
        { status: 400 }
      );
    }

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { error: 'format must be "json" or "csv"' },
        { status: 400 }
      );
    }

    // Fetch data from aggregator
    const endpoint = type === 'hot' ? '/api/hot' : '/api/trending-up';
    const response = await fetch(
      `${AGGREGATOR_URL}${endpoint}?timeframe=${timeframe}&limit=100`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from aggregator' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const topics = data.topics || [];

    // Export as JSON
    if (format === 'json') {
      return NextResponse.json({
        type,
        timeframe,
        exported_at: new Date().toISOString(),
        count: topics.length,
        topics,
      }, {
        headers: {
          'Content-Disposition': `attachment; filename="trending-${type}-${timeframe}-${Date.now()}.json"`,
        },
      });
    }

    // Export as CSV
    if (format === 'csv') {
      const csv = convertToCSV(topics, type);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="trending-${type}-${timeframe}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function convertToCSV(topics: any[], type: string): string {
  if (topics.length === 0) {
    return 'No data available';
  }

  // Define headers based on type
  const headers = type === 'hot'
    ? ['Rank', 'Keyword', 'Score', 'Mentions', 'Sources', 'Summary']
    : ['Rank', 'Keyword', 'Velocity', 'Current Volume', 'Previous Volume', 'Percent Growth', 'Summary'];

  // Build CSV rows
  const rows = topics.map((topic) => {
    if (type === 'hot') {
      return [
        topic.rank,
        escapeCsvValue(topic.keyword),
        topic.score?.toFixed(2) || '0',
        topic.mentions || 0,
        escapeCsvValue(topic.sources?.join(', ') || ''),
        escapeCsvValue(topic.summary || ''),
      ];
    } else {
      return [
        topic.rank,
        escapeCsvValue(topic.keyword),
        topic.velocity?.toFixed(2) || '0',
        topic.current_volume || 0,
        topic.previous_volume || 0,
        topic.percent_growth?.toFixed(1) || '0',
        escapeCsvValue(topic.summary || ''),
      ];
    }
  });

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}

function escapeCsvValue(value: string): string {
  // Escape CSV special characters
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
