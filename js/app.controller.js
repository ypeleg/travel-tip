import { utilService } from './services/util.service.js'
import { locService } from './services/loc.service.js'
import { mapService } from './services/map.service.js'

window.onload = onInit

// To make things easier in this project structure 
// functions that are called from DOM are defined on a global app object
window.app = {
    onRemoveLoc,
    onUpdateLoc,
    onSelectLoc,
    onPanToUserPos,
    onSearchAddress,
    onCopyLoc,
    onShareLoc,
    onSetSortBy,
    onSetFilterBy,
    onSubmitModel,
}

var gUserPos 

function onInit() {
    getFilterByFromQueryParams()
    loadAndRenderLocs()
    mapService.initMap()
        .then(() => {
            // onPanToTokyo()
            mapService.addClickListener(onAddLoc)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot init map')
        })
}

function renderLocs(locs) {
    const selectedLocId = getLocIdFromQueryParams()
        

    var strHTML = locs.map(loc => {
        const className = (loc.id === selectedLocId) ? 'active' : ''
        
        var distanceToUser = ''
        if (gUserPos !== undefined) {
            distanceToUser += utilService.getDistance(gUserPos, loc.geo, 'K')
            distanceToUser = 'Distance: ' + distanceToUser + ' KM'
        }             
        
        return `
        <li class="loc ${className}" data-id="${loc.id}">
            <h4>  
                <span>${loc.name}</span>
                <span class="muted">${distanceToUser}</span>
                <span title="${loc.rate} stars">${'★'.repeat(loc.rate)}</span>
            </h4>
            <p class="muted">
                Created: ${utilService.elapsedTime(loc.createdAt)}
                ${(loc.createdAt !== loc.updatedAt) ?
                ` | Updated: ${utilService.elapsedTime(loc.updatedAt)}`
                : ''}
            </p>
            <div class="loc-btns">     
               <button title="Delete" onclick="app.onRemoveLoc('${loc.id}')">🗑️</button>
               <button title="Edit" onclick="app.onUpdateLoc('${loc.id}')">✏️</button>
               <button title="Select" onclick="app.onSelectLoc('${loc.id}')">🗺️</button>
            </div>     
        </li>`}).join('')

    const elLocList = document.querySelector('.loc-list')
    elLocList.innerHTML = strHTML || 'No locs to show'

    renderLocStats()

    if (selectedLocId) {
        const selectedLoc = locs.find(loc => loc.id === selectedLocId)
        displayLoc(selectedLoc)
    }
    document.querySelector('.debug').innerText = JSON.stringify(locs, null, 2)
}

function onRemoveLoc(locId) {

    const prm3 = Swal.fire({
        title: 'Should we?',
        showDenyButton: true,
    })

    prm3.then(res => {
        // console.log('res:', res)
        if (res.isConfirmed) {
            locService.remove(locId)
                .then(() => {
                    flashMsg('Location removed')
                    unDisplayLoc()
                    loadAndRenderLocs()
                })
                .catch(err => {
                    console.error('OOPs:', err)
                    flashMsg('Cannot remove location')
                })

        } else {
            console.log('No!')
        }
    })
}



function onSearchAddress(ev) {
    ev.preventDefault()
    const el = document.querySelector('[name=address]')
    mapService.lookupAddressGeo(el.value)
        .then(geo => {
            mapService.panTo(geo)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot lookup address')
        })
}


function onSubmitModel(event) {
    
    event.preventDefault()
    
    const id = JSON.parse(event.target.getAttribute('data-id'))
    const geo = JSON.parse(event.target.getAttribute('data-geo'))
    const locName = document.querySelector('.edit-location').value        
    const locRate = document.querySelector('.edit-rate').value        

    const dialog = document.querySelector("dialog")        
    
    if (!locName) return
    if (!locRate) return

    dialog.close()

    // console.log('id', id)

    const loc = {
        id: id,
        name: locName,
        rate: locRate,
        geo: geo,
    }  

    locService.save(loc)
        .then((savedLoc) => {
            flashMsg(`Added Location (id: ${savedLoc.id})`)
            utilService.updateQueryParams({ locId: savedLoc.id })
            loadAndRenderLocs()
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot add location')
        })

}

function onAddLoc(geo) {           

    console.log('geo', geo)

    const dialog = document.querySelector("dialog")        
    const form = document.querySelector(".modal-form")     
       
    form.setAttribute('data-geo', JSON.stringify(geo))       
    form.setAttribute('data-id', JSON.stringify(null))   
    
    document.querySelector('.edit-location').value = ''
    document.querySelector('.edit-rate').value = ''

    document.querySelector('.edit-location').placeholder = (geo.address || 'Just a place')
    document.querySelector('.edit-rate').placeholder = 3
    
    dialog.showModal()

}

function loadAndRenderLocs() {
    locService.query()
        .then(renderLocs)
        .catch(err => {
            console.log()
            console.error('OOPs:', err)
            flashMsg('Cannot load locations')
        })
}



function onPanToUserPos() {
    mapService.getUserPosition()
        .then(latLng => {
            gUserPos = {
                            lat: latLng.lat,
                            lng: latLng.lng
                       }
            mapService.panTo({ ...latLng, zoom: 15 })
            unDisplayLoc()
            loadAndRenderLocs()
            flashMsg(`You are at Latitude: ${latLng.lat} Longitude: ${latLng.lng}`)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot get your position')
        })
}

function onUpdateLoc(locId) {
    console.log('on update')
    locService.getById(locId)
        .then(loc => {

            console.log(loc.geo.address)

            const dialog = document.querySelector("dialog")        
            const form = document.querySelector(".modal-form")        

            form.setAttribute('data-geo', JSON.stringify(loc.geo))               
            form.setAttribute('data-id', JSON.stringify(loc.id))   
            
            document.querySelector('.edit-location').value = loc.name
            document.querySelector('.edit-rate').value = loc.rate
            
            dialog.showModal()

            // const rate = prompt('New rate?', loc.rate)
            // if (rate && rate !== loc.rate) {
            //     loc.rate = rate
            //     locService.save(loc)
            //         .then(savedLoc => {
            //             flashMsg(`Rate was set to: ${savedLoc.rate}`)
            //             loadAndRenderLocs()
            //         })
            //         .catch(err => {
            //             console.error('OOPs:', err)
            //             flashMsg('Cannot update location')
            //         })

            // }
        })
}

function onSelectLoc(locId) {
    return locService.getById(locId)
        .then(displayLoc)
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot display this location')
        })
}

function displayLoc(loc) {
    document.querySelector('.loc.active')?.classList?.remove('active')
    document.querySelector(`.loc[data-id="${loc.id}"]`).classList.add('active')

    mapService.panTo(loc.geo)
    mapService.setMarker(loc)

    var distanceToUser = ''
    if (gUserPos !== undefined) {
        distanceToUser += utilService.getDistance(gUserPos, loc.geo, 'K')
        distanceToUser = 'Distance: ' + distanceToUser + ' KM'
    }             


    const el = document.querySelector('.selected-loc')
    el.querySelector('.loc-name').innerText = loc.name
    el.querySelector('.loc-address').innerText = loc.geo.address
    if (distanceToUser) {
        el.querySelector('.loc-distance').innerText = distanceToUser
    } else {
        el.querySelector('.loc-distance').innerText = ''
    }
    el.querySelector('.loc-rate').innerHTML = '★'.repeat(loc.rate)
    el.querySelector('[name=loc-copier]').value = window.location
    el.classList.add('show')

    utilService.updateQueryParams({ locId: loc.id })
}

function unDisplayLoc() {
    utilService.updateQueryParams({ locId: '' })
    document.querySelector('.selected-loc').classList.remove('show')
    mapService.setMarker(null)
}

function onCopyLoc() {
    const elCopy = document.querySelector('[name=loc-copier]')
    elCopy.select()
    elCopy.setSelectionRange(0, 99999) // For mobile devices
    navigator.clipboard.writeText(elCopy.value)
    flashMsg('Link copied, ready to paste')
}

function onShareLoc() {
    const url = document.querySelector('[name=loc-copier]').value

    // title and text not respected by any app (e.g. whatsapp)
    const data = {
        title: 'Cool location',
        text: 'Check out this location',
        url
    }
    navigator.share(data)
}

function flashMsg(msg) {
    const el = document.querySelector('.user-msg')
    el.innerText = msg
    el.classList.add('open')
    setTimeout(() => {
        el.classList.remove('open')
    }, 3000)
}

function getFilterByFromQueryParams() {
    const queryParams = new URLSearchParams(window.location.search)
    const txt = queryParams.get('txt') || ''
    const minRate = queryParams.get('minRate') || 0
    locService.setFilterBy({ txt, minRate })

    document.querySelector('input[name="filter-by-txt"]').value = txt
    document.querySelector('input[name="filter-by-rate"]').value = minRate
}

function getLocIdFromQueryParams() {
    const queryParams = new URLSearchParams(window.location.search)
    const locId = queryParams.get('locId')
    return locId
}

function onSetSortBy() {
    const prop = document.querySelector('.sort-by').value
    const isDesc = document.querySelector('.sort-desc').checked

    if (!prop) return

    const sortBy = {}
    sortBy[prop] = (isDesc) ? -1 : 1

    // Shorter Syntax:
    // const sortBy = {
    //     [prop] : (isDesc)? -1 : 1
    // }

    locService.setSortBy(sortBy)
    loadAndRenderLocs()
}

function onSetFilterBy({ txt, minRate }) {
    const filterBy = locService.setFilterBy({ txt, minRate: +minRate })
    utilService.updateQueryParams(filterBy)
    loadAndRenderLocs()
}

function renderLocStats() {
    locService.getLocCountByRateMap().then(stats => {
        handleStats(stats, 'loc-stats-rate')
    })

    locService.getLocCountByUpdateMap().then(stats => {
        handleStats(stats, 'loc-stats-update')
    })
}

function handleStats(stats, selector) {
    // stats = { low: 37, medium: 11, high: 100, total: 148 }
    // stats = { low: 5, medium: 5, high: 5, baba: 55, mama: 30, total: 100 }
    const labels = cleanStats(stats)
    const colors = utilService.getColors()

    var sumPercent = 0
    var colorsStr = `${colors[0]} ${0}%, `
    labels.forEach((label, idx) => {
        if (idx === labels.length - 1) return
        const count = stats[label]
        const percent = Math.round((count / stats.total) * 100, 2)
        sumPercent += percent
        colorsStr += `${colors[idx]} ${sumPercent}%, `
        if (idx < labels.length - 1) {
            colorsStr += `${colors[idx + 1]} ${sumPercent}%, `
        }
    })

    colorsStr += `${colors[labels.length - 1]} ${100}%`
    // Example:
    // colorsStr = `purple 0%, purple 33%, blue 33%, blue 67%, red 67%, red 100%`

    const elPie = document.querySelector(`.${selector} .pie`)
    const style = `background-image: conic-gradient(${colorsStr})`
    elPie.style = style

    const ledendHTML = labels.map((label, idx) => {
        return `
                <li>
                    <span class="pie-label" style="background-color:${colors[idx]}"></span>
                    ${label} (${stats[label]})
                </li>
            `
    }).join('')

    const elLegend = document.querySelector(`.${selector} .legend`)
    elLegend.innerHTML = ledendHTML
}

function cleanStats(stats) {
    const cleanedStats = Object.keys(stats).reduce((acc, label) => {
        if (label !== 'total' && stats[label]) {
            acc.push(label)
        }
        return acc
    }, [])
    return cleanedStats
}
