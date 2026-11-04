"""Check import artifacts without claiming end-to-end authorization."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name):
    return json.loads((ROOT / 'workflows' / name).read_text(encoding='utf-8'))


def test_index_is_an_explicit_inactive_credential_free_demo():
    flow = load('dubakwi-index.json')
    assert flow['active'] is False
    assert 'demo' in flow['name'].lower()
    assert all('credentials' not in n for n in flow['nodes'])
    nodes = {n['name']: n for n in flow['nodes']}
    assert 'dubakwi-demo-public' in nodes['Insert chunk']['parameters']['memoryKey']['value']
    assert 'dubakwi-demo-restricted' in nodes['Insert chunk']['parameters']['memoryKey']['value']
    assert 'clearStore' in nodes['Prepare chunks']['parameters']['jsCode']


def test_search_requires_internal_auth_and_has_separate_partitions():
    flow = load('dubakwi-search.json')
    nodes = {n['name']: n for n in flow['nodes']}
    assert flow['active'] is False
    assert all('credentials' not in n for n in flow['nodes'])
    assert nodes['Webhook']['parameters']['authentication'] == 'headerAuth'
    assert nodes['Webhook']['parameters']['path'] == 'dubakwi-search'
    assert nodes['Search public']['parameters']['memoryKey']['value'] == 'dubakwi-demo-public'
    assert nodes['Search restricted']['parameters']['memoryKey']['value'] == 'dubakwi-demo-restricted'
    route = flow['connections']['Is staff']['main']
    assert route[0][0]['node'] == 'Search restricted'
    assert route[1][0]['node'] == 'Citizen result'
