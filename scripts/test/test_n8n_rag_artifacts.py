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
    assert route[1][0]['node'] == 'Final readiness citizen'


def test_index_marks_building_before_inserts_and_ready_after_loop():
    flow = load('dubakwi-index.json')
    c = flow['connections']
    assert c['Manual']['main'][0][0]['node'] == 'Start marker'
    assert c['Start marker']['main'][0][0]['node'] == 'Mark building'
    assert c['Mark building']['main'][0][0]['node'] == 'Prepare chunks'
    assert c['One chunk']['main'][0][0]['node'] == 'Finish marker'
    assert c['Finish marker']['main'][0][0]['node'] == 'Mark ready'


def test_search_checks_generation_before_and_after_retrieval():
    flow = load('dubakwi-search.json')
    c = flow['connections']
    assert c['Valid and enabled']['main'][0][0]['node'] == 'Read readiness'
    assert c['Is index ready']['main'][1][0]['node'] == 'Index unavailable'
    for name in ('Citizen result', 'Staff result'):
        code = next(n for n in flow['nodes'] if n['name'] == name)['parameters']['jsCode']
        assert "fm.generation !== $('Initial readiness').first().json.generation" in code
